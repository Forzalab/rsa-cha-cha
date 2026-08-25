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
#include <GraphAdjList.h> 
using namespace std; // for convieniece

namespace mp = boost::multiprecision;
using cpp_int = mp::cpp_int;
using key = cpp_int;
using prime_size = uint32_t;
using URLString = string;
using GraphAdjList = bridges::datastructure::GraphAdjList<string, string, string>;
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
    static URLString get_visualization_url(const cpp_int& p, const cpp_int& q, const cpp_int& n, const cpp_int& t, const key& e, const key& d); // MUST return a string - param can be anything u please. if change param, change it both at declaration + definition, or u will get compile err
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

inline key Utility::E(const cpp_int& n) {
    cpp_int E = 65537;
	if(gcd(E, n) == 1){
	return E;
}    
E = 3;
while (gcd(E,n) != 1){
	E += 2;
}
	return E;
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

inline URLString Utility::get_visualization_url(const cpp_int& p, const cpp_int& q, const cpp_int& n, const cpp_int& t, const key& e, const key& d) {
    // this will need BRIDGES, but just complete the other ones first pls
    // ill try to setup BRIDGES libs ASAP
string apiKey = "YOUR_API_KEY";
string userName = "YOUR_USERNAME";

bridges::Bridges bridges(1, userName, apiKey);


bridges::datastructure::GraphAdjList<string, string, int> graph;

    graph.addVertex("p", p.str());
    graph.addVertex("q", q.str());
    graph.addVertex("N", n.str());
    graph.addVertex("totient", t.str());
    graph.addVertex("e", e.str());
    graph.addVertex("d", d.str());

    graph.addEdge("p", "N", 1);
    graph.addEdge("q", "N", 1);
    graph.addEdge("p", "totient", 1);
    graph.addEdge("q", "totient", 1);
    graph.addEdge("totient", "e", 1);
    graph.addEdge("e", "d", 1);


bridges.setDataStructure(&graph);
bridges.visualize();

string url =  "https://assignments.bridgesuncc.org/assignments/" +
        std::to_string(1) +
        "/" +
        userName;
	return URLString(url);
}

#endif
