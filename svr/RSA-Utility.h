#ifndef RSA_UTIL
#define RSA_UTIL

#include <boost/multiprecision/cpp_int.hpp> //Bigint
#include <boost/multiprecision/cpp_dec_float.hpp> //Bigfloat
#include <boost/multiprecision/miller_rabin.hpp> //Prime testing
#include <boost/math/constants/constants.hpp> //Has pi
#include <cstdint> // unambigiuous int def
#include <string> // bcs strings is rad
#include <Bridges.h> // Bridges libs/include 
#include <boost/random.hpp> // for random num generator 
#include <ColorGrid.h>
#include <vector>
#include <algorithm>
#include <cstddef>

using namespace std; // for convieniece

// ---------------------------------------------------------------- BRIDGES
// FILL THESE IN. Hardcoded on purpose -- no env vars, no config file, no key
// management (handout section 2). Copy them off the BRIDGES account page.
inline const std::string BRIDGES_USERNAME = "Knelt3801";
inline const std::string BRIDGES_APIKEY   = "1528650419935";
inline constexpr unsigned int BRIDGES_ASSIGNMENT = 69696969;

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
		static bool is_small_prime(const cpp_int& x);
		static key E(const cpp_int& t, const cpp_int& n); /// 65537 unless N is smaller
		static key D(const key& e, const cpp_int& t);
		// Two bands of bytes, plaintext over ciphertext, in one grid. Hue is
		// the byte value. Readable text lives in a narrow slice of the byte
		// range, so the top band comes out banded and repetitive; ciphertext
		// is spread flat across all 256 values, so the bottom band is static.
		// The picture argues for itself. Nothing has to be captioned.
		static URLString get_visualization_url(const std::vector<int>& plain, const std::vector<int>& cipher);
		static bridges::Bridges get_bridges();
};

inline cpp_int Utility::gcd(const cpp_int& a, const cpp_int& b) {
	cpp_int x = a, y = b;
	while(y != 0){
		cpp_int temp = y;
		y = x % y;
		x = temp; 
	}
	return x;
}

inline cpp_int Utility::get_new_prime(prime_size size) {
	// Implement prime gen here
	boost::random::mt19937 gen(std::random_device{}());

	cpp_int lower = mp::pow(cpp_int(10), size - 1);
	cpp_int upper = mp::pow(cpp_int(10), size) - 1;

	boost::random::uniform_int_distribution<cpp_int> dist(lower, upper);
	cpp_int candidate = dist(gen);
	if(candidate % 2 == 0) candidate += 1;

	while (!mp::miller_rabin_test(candidate,25,gen)){
		candidate = dist(gen);
		if(candidate % 2 == 0) candidate += 1; 
	}
	return candidate;
}

inline cpp_int Utility::N(const cpp_int& p, const cpp_int& q) {
	// Implement N here
	cpp_int N = p * q;
	return N;
}

inline cpp_int Utility::T(const cpp_int& p, const cpp_int& q) {
	// T function here
	cpp_int  T = (p-1) * (q-1);
	return T;
}

// Trial division is enough here. E is always tiny -- 65537 at the top, and
// the fallback only runs when N is smaller than that.
inline bool Utility::is_small_prime(const cpp_int& x) {
	if (x < 2) return false;
	for (cpp_int f = 2; f * f <= x; ++f) {
		if (x % f == 0) return false;
	}
	return true;
}

// Kerney's spec: use 65537 for E, unless N is smaller than that, in which
// case pick a prime smaller than N. Coprimality with T is the extra
// condition -- without it D does not exist at all.
inline key Utility::E(const cpp_int& t, const cpp_int& n) {
	const cpp_int preferred = 65537;
	if (n > preferred && gcd(preferred, t) == 1) return preferred;

	for (cpp_int candidate = 3; candidate < n; candidate += 2) {
		if (is_small_prime(candidate) && gcd(candidate, t) == 1) return candidate;
	}
	return 0; // no usable exponent for this modulus
}
inline key Utility::D(const key& e, const cpp_int& n) {
	cpp_int old_r = e, r = n;
	cpp_int old_s = 1, s = 0;

	while(r != 0){
		cpp_int quotient = old_r / r;

		cpp_int temp_r = old_r - quotient * r; 
		old_r = r; 
		r = temp_r; 

		cpp_int temp_s = old_s - quotient * s;
		old_s = s;
		s = temp_s;
	}

	cpp_int d = old_s % n;
	if (d<0) d+= n;

	return d;
}    

// Byte value -> colour, straight round the hue circle. A plain ramp would put
// every printable character into one narrow patch of grey and the two bands
// would look alike; spreading them over the full circle is what makes the
// difference visible from across a room.
inline bridges::Color byte_hue(int byte) {
	const double h = (byte / 256.0) * 6.0;   // sixths of the circle
	const int    seg = static_cast<int>(h);
	const double f = h - seg;
	const int    hi = 242, lo = 38;
	const int    up = lo + static_cast<int>((hi - lo) * f);
	const int    dn = hi - static_cast<int>((hi - lo) * f);
	switch (seg) {
		case 0:  return bridges::Color(hi, up, lo);
		case 1:  return bridges::Color(dn, hi, lo);
		case 2:  return bridges::Color(lo, hi, up);
		case 3:  return bridges::Color(lo, dn, hi);
		case 4:  return bridges::Color(up, lo, hi);
		default: return bridges::Color(hi, lo, dn);
	}
}

inline URLString Utility::get_visualization_url(const std::vector<int>& plain,
                                                const std::vector<int>& cipher) {
	bridges::Bridges bridges(BRIDGES_ASSIGNMENT, BRIDGES_USERNAME, BRIDGES_APIKEY);

	const int COLS = 48;
	const int GAP  = 2;                       // dark rule between the bands
	const auto rows_for = [&](std::size_t n) {
		return static_cast<int>((n + COLS - 1) / COLS);
	};
	const int top    = std::max(1, rows_for(plain.size()));
	const int bottom = std::max(1, rows_for(cipher.size()));

	bridges::datastructure::ColorGrid grid(top + GAP + bottom, COLS,
	                                       bridges::Color(14, 14, 18));

	for (std::size_t i = 0; i < plain.size(); ++i)
		grid.set(static_cast<int>(i / COLS), static_cast<int>(i % COLS),
		         byte_hue(plain[i] & 0xff));

	for (std::size_t i = 0; i < cipher.size(); ++i)
		grid.set(top + GAP + static_cast<int>(i / COLS), static_cast<int>(i % COLS),
		         byte_hue(cipher[i] & 0xff));

	bridges.setDataStructure(&grid);
	bridges.visualize();   // throws on a bad key, a dead server, or a 413

	// Ask the library rather than rebuilding the string. Bridges.h builds it
	// from BASE_URL, which is http:// and not https://, and it uses the
	// assignment number it actually posted to. A hand-written copy drifts the
	// first time either of those moves.
	return URLString(bridges.getVisualizeURL());
}

#endif
