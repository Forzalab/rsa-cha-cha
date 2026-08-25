#ifndef RSA_CORE
#define RSA_CORE

#include "RSA-Utility.h"

using Message = cpp_int;

// namespace std already been applied

// goal: generalizable to js - lol nope, the inverse was true
class LocksmithBox {
private:
    // aux value here
    key key_;   // notice - key distinction doesnt really matter. this would be
                // reused for signing AND encrypting (as well as inverse op)
    cpp_int n_;
    bool key_is_priv_; // it does matter... ish? this is a consensual flag, camt verify if pub or priv either way at creation.

public:
    LocksmithBox(const cpp_int& n, const key& k, bool key_is_priv); // one obj per key, key cannot be reset hahahahahahhahah. how to store keys....?
    LocksmithBox(const LocksmithBox& original_box, const key& k, bool key_is_priv);
    cpp_int decimal_from_text(const string& text) const;
    string  text_from_decimal(cpp_int big_num) const;
 
    Message encrypt(const string& message, bool override_keytype_check = false) const;
    string  decrypt(const Message& encrypted_msg_decimal, bool override_keytype_check = false) const;
    Message sign(const string& message) const;
    string  verify(const Message& signed_msg_decimal) const;
};

inline LocksmithBox::LocksmithBox(const cpp_int& n, const key& k, bool key_is_priv) {
    this->n_ = n;
    this->key_ = k;
    this->key_is_priv_ = key_is_priv;    
}

inline LocksmithBox::LocksmithBox(const LocksmithBox& original_box, const key& k, bool key_is_priv) {
    this->n_ = original_box.n_;
    this->key_ = k;
    this->key_is_priv_ = key_is_priv;
}

inline Message LocksmithBox::decimal_from_text(const string& text) const {
    // text -> one big integer
    Message msg = 0;

    for (int i = text.length() - 1; i >= 0; i--) {
        unsigned char c = text[i];
        msg <<= 8;
        msg += c;
    }

    return msg;
}

inline string LocksmithBox::text_from_decimal(cpp_int big_num) const {
    // inverse of decimal_from_text
    string text = "";

    // right shift wonky with Boost :-((
    while (big_num > 0) {
        unsigned char c = static_cast<unsigned char>(big_num % 256); // mf boost
        text += c;
        big_num /= 256;
    }
    
    return text;
}

inline Message LocksmithBox::encrypt(const string& message, bool override_keytype_check) const {
    // prevent dumb user (me)
    if (key_is_priv_ && !override_keytype_check) { 
        cout << "[ERROR] priv key attempted for encryption. If you're meant to sign message, use sign() instead" << endl;
        return cpp_int("67"); // error code instead of crashing - prevent demo embarrasment
    } else if (override_keytype_check) {
        cout << "[INFO] Keytype check overriden at encrypt(), ignoring." << endl;
    }
    const Message msg_decimal = LocksmithBox::decimal_from_text(message);
    const key pubkey = this->key_; // assumes stored key is pubkey - func is indiscriminant.
    const Message encrypted_msg_decimal = powm(msg_decimal, pubkey, n_);
    return encrypted_msg_decimal;
}

inline string LocksmithBox::decrypt(const Message& encrypted_msg_decimal, bool override_keytype_check) const {
    // prevent dumb user (me)
    if (!key_is_priv_ && !override_keytype_check) { 
        cout << "[ERROR] pub key attempted for decryption. If you're meant to verify message, use verify() instead" << endl;
        return "67"; // error code instead of crashing - prevent demo embarrasment
    } else if (override_keytype_check) {
        cout << "[INFO] Keytype check overriden at decrypt(), ignoring." << endl;
    }
    const key privkey = this->key_; // assumes stored key is privkey
    const Message decrypted_msg_decimal = powm(encrypted_msg_decimal, privkey, n_);
    const string decrypted_message = LocksmithBox::text_from_decimal(decrypted_msg_decimal);
    return decrypted_message;
}

inline Message LocksmithBox::sign(const string& message) const {
    // prevent dumb user (me)
    if (!key_is_priv_) { 
        cout << "[ERROR] pub key attempted for signing. If you're meant to encrypt message, use encrypt() instead" << endl;
        return cpp_int("69"); // error code instead of crashing - prevent demo embarrasment
    }
    return this->encrypt(message, true);
}

inline string LocksmithBox::verify(const Message& signed_msg_decimal) const {
        // prevent dumb user (me)
    if (key_is_priv_) { 
        cout << "[ERROR] priv key attempted for sig verify. If you're meant to decrypt message, use decrypt() instead" << endl;
        return "69"; // error code instead of crashing - prevent demo embarrasment
    }
    return this->decrypt(signed_msg_decimal, true);
}

#endif
