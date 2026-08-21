#ifndef RSA
#define RSA

#include "RSA-Utility.h"

using Message = cpp_int;

// namespace std already been applied

// goal: generalizable to js
class CipherCore {
private:
    // aux value here
    Key key = null; // notice - key distinction doesnt really matter. this would be reused for signing AND encrypting (as well as inverse op)
    cpp_int N = null;
public:
    CipherCore(const cpp_int& N, const cpp_int& key); // one obj per key hahahahahahhahah
    cpp_int decimal_from_text(const string& text) const;
    string text_from_decimal(const cpp_int& big_num) const;    
    void rotate_key(const cpp_int& P, const cpp_int& Q);
    Message encrypt(const string& message) const;
    string decrypt(const Message& message) const;
    Message sign(const string& message) const;
    string verify(const Message& message) const;    
};

#endif
