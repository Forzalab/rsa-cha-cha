#ifndef RSA_UTIL
#define RSA_UTIL

#include <boost/multiprecision/cpp_int.hpp> //Bigint
#include <boost/multiprecision/cpp_dec_float.hpp> //Bigfloat
#include <boost/multiprecision/miller_rabin.hpp> //Prime testing
#include <boost/math/constants/constants.hpp> //Has pi
#include <cstdint> // unambigiuous int def
#include <string> // bcs strings is rad

using namespace std; // for convieniece

namespace mp = boost::multiprecision;
using cpp_int = mp::cpp_int;
using key = cpp_int;
using prime_size = uint32_t;
using URLString = string;

// interfaces - avoid .h to reduce complexity for newbies
// To Bruce: only implement in the brackets below the class braxket, dont fill out anything in Utility class scope!!!!! <3
// its gonna be a rabbit hole, lol
class Utility {
private:
    // anything private decl goes here
    // suggestions:
    static cpp_int gcd(const cpp_int& a, const cpp_int& b);
    
public:
    static cpp_int get_new_prime(prime_size size);
    static cpp_int N(const cpp_int& p, const cpp_int& q);
    static cpp_int T(const cpp_int& p, const cpp_int& q); // totient
    static key E(const cpp_int& t); /// google for what e should be
    static key D(const key& e, const cpp_int& t);
    URLString get_visualization_url(); // MUST return a string - param can be anything u please
};

inline cpp_int Utility::gcd(const cpp_int& a, const cpp_int& b) {
    return 0;
}

inline cpp_int Utility::get_new_prime(prime_size size) {
    // Implement prime gen here
    return 0;
}

inline cpp_int Utility::N(const cpp_int& p, const cpp_int& q) {
    // Implement N here
    return 0;
}

inline cpp_int Utility::T(const cpp_int& p, const cpp_int& q) {
    // T function here
    return 0;
}

inline key Utility::E(const cpp_int& n) {
    return 0;
}    

inline key Utility::D(const key& e, const cpp_int& n) {
    return 0;
}    

#endif
