// human: wtf

#pragma once

// Transport.h -- WebSocket layer for rsa-cha-cha.
// No crypto in here. This file moves strings and nothing else.

#include <boost/asio/io_context.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <nlohmann/json.hpp>

#include <deque>
#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <utility>

namespace bo = boost::asio;
namespace bb = boost::beast;
namespace wsock = boost::beast::websocket;

using tcp = boost::asio::ip::tcp;
using json = nlohmann::json;

// ---------------------------------------------------------------- envelope

inline json envelope(const std::string& from,
                     const std::string& to,
                     const std::string& request,
                     json content = json::object()) {
    return json{{"sender", from},
                {"receiver", to},
                {"request", request},
                {"content", std::move(content)}};
}

class Hub;

// ---------------------------------------------------------------- Session
//
// One per open browser tab. Lives as a shared_ptr; every async callback
// captures shared_from_this(), so the object survives exactly as long as
// there is an operation in flight. When the socket closes and the last
// callback returns, the refcount hits zero and it frees itself. Hub holds
// weak_ptr only, so a dead session leaves a stale handle that expires on
// its own -- nobody sweeps the map.

class Session : public std::enable_shared_from_this<Session> {
   public:
    Session(tcp::socket sock, Hub& hub)
        : ws_(std::move(sock)), hub_(hub) {}

    void run();
    void send(const json& msg);

    const std::string& userid() const { return userid_; }
    void set_userid(std::string id) { userid_ = std::move(id); }
    bool joined() const { return !userid_.empty(); }

   private:
    void on_accept(bb::error_code ec);
    void do_read();
    void on_read(bb::error_code ec, std::size_t bytes);
    void do_write();
    void on_write(bb::error_code ec, std::size_t bytes);

    wsock::stream<tcp::socket> ws_;
    bb::flat_buffer buf_;
    std::deque<std::string> out_;  // your chatchapoon mailbox, minus the locks
    Hub& hub_;
    std::string userid_;
};

// ---------------------------------------------------------------- Hub
//
// The public-key directory and the router. userid -> (session, public key).

class Hub {
   public:
    struct Entry {
        std::weak_ptr<Session> session;
        std::string key_value;
        std::string key_mod;
        std::string key_type;
    };

    // Returns nullptr if the name was never registered or the tab is gone.
    std::shared_ptr<Session> find(const std::string& who) {
        auto it = dir_.find(who);
        if (it == dir_.end()) return nullptr;
        return it->second.session.lock();
    }

    const Entry* entry(const std::string& who) const {
        auto it = dir_.find(who);
        return it == dir_.end() ? nullptr : &it->second;
    }

    void route(const std::shared_ptr<Session>& from, const std::string& frame);

   private:
    void do_join(const std::shared_ptr<Session>&, const json&);
    void do_lookup(const std::shared_ptr<Session>&, const json&);
    void do_send(const std::shared_ptr<Session>&, const json&);

    std::map<std::string, Entry> dir_;
};

// ---------------------------------------------------------------- Session impl

inline void Session::run() {
    ws_.set_option(wsock::stream_base::decorator([](wsock::response_type& res) {
        res.set(bb::http::field::server, "rsa-cha-cha");
    }));
    ws_.text(true);
    ws_.async_accept(bb::bind_front_handler(&Session::on_accept, shared_from_this()));
}

inline void Session::on_accept(bb::error_code ec) {
    if (ec) {
        std::cerr << "accept: " << ec.message() << "\n";
        return;
    }
    do_read();
}

inline void Session::do_read() {
    ws_.async_read(buf_, bb::bind_front_handler(&Session::on_read, shared_from_this()));
}

inline void Session::on_read(bb::error_code ec, std::size_t) {
    if (ec) {
        // Normal tab close lands here. Session dies when this returns.
        if (ec != wsock::error::closed)
            std::cerr << "read [" << userid_ << "]: " << ec.message() << "\n";
        return;
    }

    std::string frame = bb::buffers_to_string(buf_.data());
    buf_.consume(buf_.size());

    std::cout << "<- " << frame << "\n";
    hub_.route(shared_from_this(), frame);

    do_read();
}

inline void Session::send(const json& msg) {
    std::string text = msg.dump();
    std::cout << "-> " << text << "\n";

    out_.push_back(std::move(text));
    // Two async_writes in flight on one stream is UB. Size == 1 means
    // nothing was writing, so this call owns the kickoff.
    if (out_.size() == 1) do_write();
}

inline void Session::do_write() {
    ws_.async_write(bo::buffer(out_.front()),
                    bb::bind_front_handler(&Session::on_write, shared_from_this()));
}

inline void Session::on_write(bb::error_code ec, std::size_t) {
    if (ec) {
        std::cerr << "write [" << userid_ << "]: " << ec.message() << "\n";
        return;
    }
    out_.pop_front();
    if (!out_.empty()) do_write();
}

// ---------------------------------------------------------------- Hub impl

inline void Hub::route(const std::shared_ptr<Session>& from, const std::string& frame) {
    json msg = json::parse(frame, nullptr, false);

    // Parse failed -> sender field is not trustworthy, but the socket is fine.
    if (msg.is_discarded() || !msg.is_object() || !msg.contains("request")) {
        from->send(envelope("SERVER", "?", "ERR_BAD_JSON"));
        return;
    }

    const std::string request = msg.value("request", "");

    if (request == "JOIN") {
        do_join(from, msg);
    } else if (!from->joined()) {
        from->send(envelope("SERVER", "?", "ERR_NOT_JOINED"));
    } else if (request == "LOOKUP") {
        do_lookup(from, msg);
    } else if (request == "SEND") {
        do_send(from, msg);
    } else {
        from->send(envelope("SERVER", from->userid(), "ERR_UNSPC"));
    }
}

inline void Hub::do_join(const std::shared_ptr<Session>& from, const json& msg) {
    const std::string who = msg.value("sender", "");
    const json content = msg.value("content", json::object());

    if (who.empty() || who == "SERVER" || from->joined() || find(who)) {
        from->send(envelope("SERVER", who, "ERR_DUPL_JOIN"));
        return;
    }

    Entry e;
    e.session = from;
    e.key_value = content.value("key_value", "");
    e.key_mod = content.value("key_mod", "");
    e.key_type = content.value("key_type", "pub");
    dir_[who] = e;

    from->set_userid(who);
    std::cout << "   join: " << who << "\n";

    from->send(envelope("SERVER", who, "JOIN_SUCC",
                        json{{"key_value", e.key_value},
                             {"key_mod", e.key_mod},
                             {"key_type", e.key_type}}));
}

inline void Hub::do_lookup(const std::shared_ptr<Session>& from, const json& msg) {
    const std::string who = msg.value("content", json::object()).value("who", "");
    const Entry* e = entry(who);

    if (!e || e->session.expired()) {
        from->send(envelope("SERVER", from->userid(), "ERR_NO_USER", json{{"who", who}}));
        return;
    }

    from->send(envelope("SERVER", from->userid(), "LOOKUP_SUCC",
                        json{{"who", who},
                             {"key_value", e->key_value},
                             {"key_mod", e->key_mod},
                             {"key_type", e->key_type}}));
}

inline void Hub::do_send(const std::shared_ptr<Session>& from, const json& msg) {
    const std::string to = msg.value("receiver", "");
    auto target = find(to);

    if (!target) {
        from->send(envelope("SERVER", from->userid(), "ERR_NO_USER", json{{"who", to}}));
        return;
    }

    // content and content_sig pass through untouched -- that is what makes
    // item 3 verifiable end to end. The server does not look inside.
    json deliver = envelope(from->userid(), to, "DELIVER", msg.value("content", json::object()));
    if (msg.contains("content_sig")) deliver["content_sig"] = msg["content_sig"];

    target->send(deliver);
    from->send(envelope("SERVER", from->userid(), "SEND_SUCC", json{{"to", to}}));
}

// ---------------------------------------------------------------- accept loop

inline void do_accept(tcp::acceptor& acc, Hub& hub) {
    acc.async_accept([&acc, &hub](bb::error_code ec, tcp::socket sock) {
        if (ec) {
            std::cerr << "listen: " << ec.message() << "\n";
        } else {
            std::make_shared<Session>(std::move(sock), hub)->run();
        }
        do_accept(acc, hub);  // re-arm
    });
}
