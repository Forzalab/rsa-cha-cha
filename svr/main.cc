#include "Transport.h"

#include <cstdlib>
#include <iostream>

int main(int argc, char** argv) {
    unsigned short port = 6868;
    if (argc > 1) port = static_cast<unsigned short>(std::atoi(argv[1]));

    try {
        // One thread. One io_context. Every socket operation is a callback
        // on this loop, so nothing runs concurrently and no mutex exists
        // anywhere in this server.
        bo::io_context ioc{1};

        Hub hub;
        tcp::acceptor acc{ioc, tcp::endpoint{tcp::v4(), port}};
        acc.set_option(bo::socket_base::reuse_address(true));

        do_accept(acc, hub);

        std::cout << "rsa-cha-cha listening on ws://0.0.0.0:" << port << "\n";
        ioc.run();
    } catch (const std::exception& e) {
        std::cerr << "fatal: " << e.what() << "\n";
        return 1;
    }
    return 0;
}
