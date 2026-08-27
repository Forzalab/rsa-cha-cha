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
#include <GraphAdjList.h>
#include <vector>
#include <algorithm>
#include <cstddef>
#include <chrono>

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
		// Two slides under one URL. Slide 1 is the keypair: six labelled nodes
		// wired in the order they are actually derived. Slide 2 is the same
		// message twice over, plaintext bytes above ciphertext bytes.
		static URLString get_visualization_url(const cpp_int& p, const cpp_int& q,
		                                        const cpp_int& n, const cpp_int& t,
		                                        const key& e, const key& d,
		                                        const std::vector<int>& plain,
		                                        const std::vector<int>& cipher);
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

// Verified against Element.h: the node JSON carries color, location, shape,
// size and `name` -- and `name` is the LABEL. The second argument to
// addVertex lands in `value`, which is never serialised. That is the whole
// reason the first attempt rendered six bare names: the numbers were being
// stored somewhere the browser never reads. setLabel is the only way in.
inline std::string node_text(const std::string& name, const cpp_int& v) {
	const std::string digits = v.str();
	if (digits.size() <= 22) return name + " = " + digits;
	return name + " = " + digits.substr(0, 10) + "\u2026" +
	       digits.substr(digits.size() - 6) + "  (" +
	       std::to_string(digits.size()) + " digits)";
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

inline URLString Utility::get_visualization_url(const cpp_int& p, const cpp_int& q,
                                                const cpp_int& n, const cpp_int& t,
                                                const key& e, const key& d,
                                                const std::vector<int>& plain,
                                                const std::vector<int>& cipher) {
	bridges::Bridges bridges(BRIDGES_ASSIGNMENT, BRIDGES_USERNAME, BRIDGES_APIKEY);

	// ---- slide 1: the keypair -------------------------------------------
	{
		// Measured against the live renderer, three configurations:
		//   locations + setWindow  -> spread, fills the canvas
		//   locations, no window   -> same layout, drawn tiny in a corner
		//   no locations at all    -> every node piled on one spot
		// So locations are effectively mandatory, and setWindow is what makes
		// the viewport match their extent instead of some default.
		//
		// Careful: the real signature is (xmin, xmax, ymin, ymax). The doc
		// comment above it in Bridges.h says (xmin, ymin, xmax, ymax) and is
		// wrong -- the body pushes back x, x, y, y.
		bridges.setCoordSystemType("window");
		bridges.setWindow(0.0, 1050.0, 0.0, 720.0);

		bridges::datastructure::GraphAdjList<string, string, string> keys;
		for (const char* k : {"p", "q", "N", "T", "e", "d"}) keys.addVertex(k, "");

		keys.getVertex("p")->setLabel(node_text("p", p));
		keys.getVertex("q")->setLabel(node_text("q", q));
		keys.getVertex("N")->setLabel(node_text("N", n));
		keys.getVertex("T")->setLabel(node_text("T", t));
		keys.getVertex("e")->setLabel(node_text("e", e));
		keys.getVertex("d")->setLabel(node_text("d", d));

		// Colour says one thing and one thing only: who is allowed to see it.
		// Gold travels; red never leaves the machine that made it. Somebody
		// who knows no RSA still reads two groups off this picture.
		const bridges::Color PUBLIC(255, 209, 0);
		const bridges::Color SECRET(226, 42, 74);
		for (const char* k : {"N", "e"}) {
			keys.getVertex(k)->setColor(PUBLIC);
			keys.getVertex(k)->setShape(bridges::STAR);
			keys.getVertex(k)->setSize(48.0);
		}
		for (const char* k : {"p", "q", "d"}) {
			keys.getVertex(k)->setColor(SECRET);
			keys.getVertex(k)->setShape(bridges::SQUARE);
			keys.getVertex(k)->setSize(34.0);
		}
		keys.getVertex("T")->setColor(bridges::Color(150, 120, 190));
		keys.getVertex("T")->setShape(bridges::DIAMOND);
		keys.getVertex("T")->setSize(30.0);

		// setLocation values reach the renderer unchanged, so they are real
		// units, not a normalised range.
		//
		// p and q each feed BOTH N and T, so those four form K(2,2). Drawn as
		// two columns that graph cannot avoid p->T crossing q->N. K(2,2) is
		// planar though: seat the four on a diamond and the same four edges
		// become its sides, crossing nothing. The tail runs off the near
		// corner.
		//
		//          N              p, q  the primes, left and right
		//        /   \            N     public modulus, far corner
		//       p     q           T     private intermediate, near corner
		//        \   /
		//          T  --> e --> d
		keys.getVertex("p")->setLocation(120.0, 350.0);
		keys.getVertex("N")->setLocation(340.0, 620.0);
		keys.getVertex("q")->setLocation(560.0, 350.0);
		keys.getVertex("T")->setLocation(340.0,  90.0);
		keys.getVertex("e")->setLocation(720.0, 170.0);
		keys.getVertex("d")->setLocation(950.0, 320.0);

		keys.addEdge("p", "N"); keys.addEdge("q", "N");
		keys.addEdge("p", "T"); keys.addEdge("q", "T");
		keys.addEdge("T", "e"); keys.addEdge("T", "d");
		keys.addEdge("e", "d");
		// Edges carry structure, not arithmetic. 
		for (auto pair : {std::pair<const char*, const char*>{"p", "N"}, {"q", "N"},
		                  {"p", "T"}, {"q", "T"}, {"T", "e"}, {"T", "d"}, {"e", "d"}}) {
			auto* link = keys.getLinkVisualizer(pair.first, pair.second);
			link->setThickness(3.0);
			// An arrowhead on a curve that overlaps three others is unreadable.
			// Colour each edge like the node it feeds instead: gold arrives at
			// N and e, purple at T, red at d.
			const std::string dest = pair.second;
			link->setColor(dest == "N" || dest == "e" ? bridges::Color(214, 170, 0)
			             : dest == "T"                ? bridges::Color(150, 120, 190)
			                                          : bridges::Color(200, 60, 80));
		}

		bridges.setDataStructure(&keys);
		bridges.visualize();
	}

	// ---- slide 2: the same message, before and after ---------------------
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

	if (!plain.empty() || !cipher.empty()) {
		bridges.setDataStructure(&grid);
		bridges.visualize();   // throws on a bad key, a dead server, or a 413
	}

	// The assignment page is served from cache, so a repost can keep showing
	// the previous drawing. BRIDGES routes on the path, so a throwaway query
	// string is ignored by their front end and treated as a new address by the
	// browser. Verified: both forms return 200.
	// Ask the library rather than rebuilding the string. Bridges.h builds it
	// from BASE_URL, which is http:// and not https://, and it uses the
	// assignment number it actually posted to. A hand-written copy drifts the
	// first time either of those moves.
	return URLString(bridges.getVisualizeURL() + "?t=" +
	                 std::to_string(std::chrono::duration_cast<std::chrono::seconds>(
	                     std::chrono::system_clock::now().time_since_epoch()).count()));
}

#endif
