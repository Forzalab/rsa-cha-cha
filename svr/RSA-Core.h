#ifndef RSA_CORE
#define RSA_CORE

#include "RSA-Utility.h"

using Message = cpp_int;

// namespace std already been applied

// goal: generalizable to js
class CipherCore {
private:
    // aux value here
    key key_;   // notice - key distinction doesnt really matter. this would be
                // reused for signing AND encrypting (as well as inverse op)
    cpp_int n_;

public:
    CipherCore(const cpp_int& n, const key& k); // one obj per key hahahahahahhahah

    cpp_int decimal_from_text(const string& text) const;
    string  text_from_decimal(const cpp_int& big_num) const;
    void    rotate_key(const cpp_int& P, const cpp_int& Q);

    Message encrypt(const string& message) const;
    string  decrypt(const Message& message) const;
    Message sign(const string& message) const;
    string  verify(const Message& message) const;
};

inline CipherCore::CipherCore(const cpp_int& n, const key& k)
    : key_(k), n_(n) {
}

inline cpp_int CipherCore::decimal_from_text(const string& text) const {
    // text -> one big integer
    return 0;
}

inline string CipherCore::text_from_decimal(const cpp_int& big_num) const {
    // inverse of decimal_from_text
    return "";
}

inline void CipherCore::rotate_key(const cpp_int& P, const cpp_int& Q) {
    // recompute and reseat n_ and key_
}

inline Message CipherCore::encrypt(const string& message) const {
    return 0;
}

inline string CipherCore::decrypt(const Message& message) const {
    return "";
}

inline Message CipherCore::sign(const string& message) const {
    return 0;
}

inline string CipherCore::verify(const Message& message) const {
    return "";
}

#endif
