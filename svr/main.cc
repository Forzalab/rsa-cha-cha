#include "bits/stdc++.h" // fuck it, fix later
#include "RSA-Core.h"

int main() {
    string s = "";
    cin >> s;

    // gen prime
    prime_size size = 256;
    cpp_int p = Utility::get_new_prime(size);
    cpp_int q = Utility::get_new_prime(size);
    cpp_int n = Utility::N(p,q), t = Utility::T(p,q);

    // key mak3r
    key e = Utility::E(t), d = Utility::D(e, t);
    
    LocksmithBox lock3r(n, e, false);
    LocksmithBox unlock3r(lock3r, d, true);
    
    Message msg = lock3r.encrypt(s);
    string result = unlock3r.decrypt(msg);

    cout << result;
}
