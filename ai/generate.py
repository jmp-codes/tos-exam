"""Generate pattern-based training questions for Bloom AI v3.
Stem templates (how questions are constructed) x subject concept banks -> labeled examples.
Output: data/generated.tsv (level<TAB>question). Deterministic (seeded)."""
import random, itertools
random.seed(42)

# ---------- concept banks by subject ----------
C = {
 "it": ["a primary key","a foreign key","normalization","an index","a stored procedure","a transaction","a join","a view","a stack","a queue","a linked list","a binary tree","a hash table","recursion","inheritance","polymorphism","encapsulation","an interface","an abstract class","a constructor","an exception","a variable","an array","a loop","a function","an API","a web service","SOAP","REST","JSON","XML","XPath","XSLT","an XML schema","a WSDL file","middleware","a message queue","an enterprise service bus","a firewall","encryption","hashing","two-factor authentication","a VPN","a router","a switch","DNS","DHCP","an IP address","a subnet mask","TCP","UDP","HTTP","HTTPS","cloud computing","virtualization","an operating system","a compiler","an interpreter","version control","unit testing","the waterfall model","agile development","a use case diagram","an ERD","a class diagram","responsive design","cookies","sessions","a CSS selector","the DOM","a cache","load balancing","a deadlock","a thread","a process"],
 "dm": ["a proposition","a tautology","a contradiction","a conditional statement","a biconditional","the contrapositive","De Morgan's laws","a truth table","a predicate","a quantifier","a set","a subset","the power set","the union of sets","the intersection of sets","a Venn diagram","a relation","an equivalence relation","a function","a one-to-one function","a permutation","a combination","the pigeonhole principle","the rule of product","the rule of sum","a graph","a tree","an Euler path","a Hamiltonian circuit","a bipartite graph","Boolean algebra","a logic gate","a Karnaugh map","a sample space","an event","conditional probability","independent events","a random variable","expected value","variance","the binomial distribution","mathematical induction","a recurrence relation"],
 "math": ["a linear equation","a quadratic equation","the slope of a line","a function's domain","a polynomial","a ratio","a proportion","a percentage","simple interest","compound interest","the Pythagorean theorem","the area of a circle","an arithmetic sequence","a geometric sequence","a matrix","a derivative","a limit","the mean","the median","the standard deviation","a normal distribution","a sample","a population","a hypothesis test","correlation"],
 "sci": ["photosynthesis","cellular respiration","the water cycle","an ecosystem","a food chain","mitosis","DNA","natural selection","Newton's second law","inertia","friction","kinetic energy","potential energy","electric current","Ohm's law","a chemical reaction","an acid","a base","the periodic table","an atom","an ion","plate tectonics","an earthquake","a typhoon","climate change","the greenhouse effect","biodiversity","the immune system","a vaccine","the digestive system"],
 "eng": ["a thesis statement","a topic sentence","a metaphor","a simile","personification","irony","the main idea","a supporting detail","an argumentative essay","a persuasive speech","subject-verb agreement","the passive voice","a complex sentence","a dangling modifier","tone","mood","point of view","foreshadowing","a flashback","a theme"],
 "soc": ["democracy","separation of powers","the Bill of Rights","the Katipunan","the Philippine Revolution","the Treaty of Paris","martial law","the EDSA People Power Revolution","globalization","inflation","supply and demand","opportunity cost","human rights","culture","colonialism","nationalism","the Galleon Trade","the barangay system","federalism","sustainable development"],
}
ALL = [(k,v) for k,vs in C.items() for v in vs]
def concept(subj=None):
    k,v = random.choice(ALL) if subj is None else (subj, random.choice(C[subj]))
    return v
def bare(x): return x[2:] if x.startswith("a ") else x[3:] if x.startswith("an ") else x[4:] if x.startswith("the ") else x
def pair(subj=None):
    k = subj or random.choice(list(C))
    a,b = random.sample(C[k],2); return a,b

SYSTEMS = ["a school library","a barangay health center","a sari-sari store","a campus canteen","a clinic","an online enrollment system","a boarding house","a fishing cooperative","a small bakery","a municipal permit office","a jeepney terminal","a student organization","a hardware store","a computer laboratory","a registrar's office","a parish office","a tricycle drivers' association","a school clinic","a public market","a farm cooperative"]
ARTIFACTS = ["a database","a mobile app","a website","a web service","an information system","a logic circuit","a network","a program","a dashboard","a class diagram","a lesson plan","a survey questionnaire","an ERD","a set of APIs","a chatbot flow","an integration plan"]
LIT = ["poem","short story","essay","speech","letter","dialogue","script","song","editorial","reflection paper"]
THEMES = ["the rainy season","friendship","the sea","honesty","climate change","life in the province","a Filipino hero","technology","family","the pandemic","first day of school","the town fiesta"]
ITEMS = ["notebooks","pens","tickets","shirts","books","chairs","loaves of bread","liters of gasoline","kilos of rice","cups of coffee"]
PEOPLE = ["students","teachers","players","applicants","members","runners","officers","volunteers","guests","nurses"]
CODES = ['x = 3; x += 2; print(x * 2)', 'print(len("system"))', 'for i in range(3): print(i)', 'a = [1,2,3]; print(a[-1])', 'print(10 % 4)', 's = "data"; print(s.upper())', 'int x = 5; System.out.println(x++ + x);']
def n(a,b): return random.randint(a,b)

T = {
"Remembering": [
 lambda: f"Which of the following is {concept()}?",
 lambda: f"Which of the following is an example of {concept()}?",
 lambda: f"What is {concept()}?",
 lambda: f"Define {concept()}.",
 lambda: f"What is the definition of {bare(concept())}?",
 lambda: f"{bare(concept()).capitalize()} is also known as ____.",
 lambda: f"The term for {concept()} is ____.",
 lambda: f"List the characteristics of {concept()}.",
 lambda: f"Enumerate the types of {bare(concept())}.",
 lambda: f"Name the parts of {concept()}.",
 lambda: f"State the definition of {bare(concept())}.",
 lambda: f"True or false: {concept('it').capitalize()} is a hardware component.",
 lambda: f"True or false: {concept('sci').capitalize()} occurs only in plants.",
 lambda: f"Who is credited with the concept of {bare(concept())}?",
 lambda: f"When was {concept('soc')} established?",
 lambda: f"What is the symbol used for {bare(concept('dm'))}?",
 lambda: f"What is the formula for {bare(concept('math'))}?",
 lambda: f"Identify the term that refers to {concept()}.",
 lambda: f"Which term refers to {concept()}?",
 lambda: f"Recall the meaning of {bare(concept())}.",
 lambda: f"Ano ang tawag sa {bare(concept())}?",
 lambda: f"Ibigay ang kahulugan ng {bare(concept())}.",
 lambda: f"Isa-isahin ang mga uri ng {bare(concept())}.",
 lambda: f"Tukuyin ang kahulugan ng {bare(concept())}.",
],
"Understanding": [
 lambda: f"Explain {concept()} in your own words.",
 lambda: f"Explain the purpose of {bare(concept())}.",
 lambda: f"Explain why {concept()} is important.",
 lambda: "Explain the difference between {} and {}.".format(*pair()),
 lambda: "What is the difference between {} and {}?".format(*pair()),
 lambda: f"Describe how {concept()} works.",
 lambda: f"Describe the role of {bare(concept())} in {random.choice(SYSTEMS)}.",
 lambda: f"Which of the following best describes {concept()}?",
 lambda: f"Which statement best explains the purpose of {bare(concept())}?",
 lambda: f"Which of the following best illustrates {concept()}?",
 lambda: f"Why is {concept()} necessary?",
 lambda: f"Why do we use {concept()}?",
 lambda: f"Give an example of {concept()} and explain it.",
 lambda: f"Summarize the main idea of {bare(concept())}.",
 lambda: f"What is meant by {bare(concept())}?",
 lambda: f"What does it mean when we say something is {bare(concept())}?",
 lambda: f"Interpret the meaning of {bare(concept())} in everyday life.",
 lambda: f"Classify the following as examples or non-examples of {bare(concept())}.",
 lambda: f"Paraphrase the definition of {bare(concept())}.",
 lambda: f"Ipaliwanag ang kahalagahan ng {bare(concept())}.",
 lambda: f"Ilarawan kung paano gumagana ang {bare(concept())}.",
 lambda: f"Bakit mahalaga ang {bare(concept())}?",
 lambda: "Ano ang pagkakaiba ng {} at {}?".format(*map(bare,pair())),
 lambda: f"Magbigay ng halimbawa ng {bare(concept())} at ipaliwanag ito.",
],
"Applying": [
 lambda: f"How many ways can {n(3,6)} {random.choice(PEOPLE)} be chosen from {n(8,15)} for a committee?",
 lambda: f"In how many ways can {n(4,8)} {random.choice(PEOPLE)} line up in a row?",
 lambda: f"How many different {n(3,6)}-digit codes can be formed using the digits 0 to 9?",
 lambda: f"If one {random.choice(ITEMS)[:-1]} costs {n(12,95)} pesos, how much do {n(3,15)} cost?",
 lambda: f"A bag has {n(2,8)} red and {n(2,8)} blue balls. What is the probability of drawing a blue ball?",
 lambda: f"If P(A) = 0.{n(1,6)} and P(B) = 0.{n(1,3)} and the events are independent, find P(A and B).",
 lambda: f"Compute C({n(7,15)},{n(2,5)}).",
 lambda: f"Compute {n(4,9)}!.",
 lambda: f"Convert {n(10,250)} to binary.",
 lambda: f"Convert {bin(n(5,60))[2:]} in binary to decimal.",
 lambda: f"What is {n(10,99)}% of {n(100,900)}?",
 lambda: f"Find the mean of {', '.join(str(n(50,99)) for _ in range(5))}.",
 lambda: f"Find the median of {', '.join(str(n(1,40)) for _ in range(5))}.",
 lambda: f"Solve for x: {n(2,9)}x + {n(1,20)} = {n(25,90)}.",
 lambda: f"Find the area of a rectangle that is {n(3,20)} m long and {n(2,12)} m wide.",
 lambda: f"Simplify the Boolean expression {random.choice(['A + AB','A(A + B)','A + NOT A · B','NOT(NOT A)','AB + A NOT B','(A + B)(A + NOT B)'])}.",
 lambda: f"Construct a truth table for {random.choice(['p AND q','p OR NOT q','p → q','NOT(p AND q)','p XOR q','(p → q) AND q'])}.",
 lambda: f"Use De Morgan's law to rewrite {random.choice(['NOT(A AND B)','NOT(A OR B)','NOT(p OR q)'])}.",
 lambda: f"Write a {random.choice(['Python','Java','C','JavaScript'])} program that {random.choice(['prints the numbers 1 to 20','computes the average of three grades','checks if a number is positive','converts kilometers to miles','counts the vowels in a word','finds the largest of three numbers','computes the sum of a list'])}.",
 lambda: f"Write an SQL query that {random.choice(['lists all students from Lubang','counts the orders per customer','shows products priced above 500','deletes records older than 2020','updates the email of employee 12','returns the average grade per section'])}.",
 lambda: f"Write the XPath expression that selects {random.choice(['all book titles','the name of the first student','all items with price greater than 100','every employee in the IT department'])}.",
 lambda: f"Calculate the number of usable hosts in a /{n(24,30)} network.",
 lambda: f"Given A = {{{', '.join(str(n(1,9)) for _ in range(3))}}} and B = {{{', '.join(str(n(1,9)) for _ in range(3))}}}, find A ∪ B.",
 lambda: f"Apply the formula for simple interest to {n(5,50)},000 pesos at {n(2,9)}% for {n(1,5)} years.",
 lambda: f"Use the given data to compute the standard deviation.",
 lambda: f"Draw the Venn diagram for {random.choice(['A ∪ B','A ∩ B','A − B','the complement of A'])}.",
 lambda: f"Lutasin: ilang paraan maaaring pumili ng {n(2,5)} mula sa {n(6,12)} na kandidato?",
 lambda: f"Kalkulahin ang {n(10,40)}% ng {n(200,900)} piso.",
 lambda: f"Gamitin ang talahanayan ng katotohanan upang makuha ang halaga ng {random.choice(['p AT q','p O q','HINDI p'])}.",
 lambda: f"I-convert ang {n(10,99)} sa binary.",
],
"Analyzing": [
 lambda: "What is the output of the following code: " + random.choice(CODES) + "?",
 lambda: f"What will be printed when the given loop runs with n = {n(3,7)}?",
 lambda: f"Which part of the following code causes {random.choice(['an infinite loop','an index error','the wrong total','a null pointer exception','a syntax error'])}?",
 lambda: f"Identify the error in the given {random.choice(['SQL query','proof','algorithm','XML document','argument','solution','truth table','network configuration'])}.",
 lambda: f"Find the logical fallacy in the following argument about {bare(concept())}.",
 lambda: "Compare {} and {} in terms of {}.".format(*pair('it'), random.choice(['speed','memory use','security','reliability','scalability','ease of use'])),
 lambda: "Contrast {} and {} using the given examples.".format(*pair()),
 lambda: "Differentiate {} from {} based on the given scenario.".format(*pair()),
 lambda: f"Examine the given {random.choice(['table','graph','chart','log file','diagram','dataset','code','survey results'])} and identify the {random.choice(['pattern','trend','anomaly','cause of the problem','relationship between the variables','weakest component'])}.",
 lambda: f"Analyze the given {random.choice(['ERD','class diagram','algorithm','circuit','argument','poem','case study','network diagram'])} and determine {random.choice(['which part is redundant','how the parts are related','where the problem lies','which assumption it depends on','its time complexity'])}.",
 lambda: f"Given the {random.choice(['output','results','data','error message','truth table','test results'])}, determine what caused {random.choice(['the failure','the difference','the unexpected value','the slowdown','the invalid result'])}.",
 lambda: f"Why does the {random.choice(['program','query','web page','web service call','parser','function','network'])} {random.choice(['return the wrong value','fail on large inputs','load slowly','show an error','print nothing','crash on empty input'])}?",
 lambda: f"What can be inferred from the given {random.choice(['graph','passage','data','experiment','survey'])} about {bare(concept())}?",
 lambda: f"Which of the following explains the difference between the two {random.choice(['results','outputs','groups','designs','solutions'])}?",
 lambda: f"Trace the given {random.choice(['code','algorithm','flowchart','XSLT transformation','recursive function'])} and determine the final value of {random.choice(['x','total','count','the result','the list'])}.",
 lambda: f"Determine whether the given {random.choice(['argument is valid','relation is transitive','graph has an Euler circuit','function is one-to-one','table is in 3NF','XML is well-formed'])} and explain how you decided.",
 lambda: f"Break down {concept()} into its components and explain how they interact.",
 lambda: f"Categorize the following {random.choice(['errors','requirements','devices','statements','costs','risks'])} and explain your basis.",
 lambda: f"Suriin ang ibinigay na {random.choice(['code','datos','argumento','talahanayan','tula'])} at tukuyin ang {random.choice(['mali','sanhi ng problema','ugnayan ng mga bahagi','pattern'])}.",
 lambda: "Ihambing ang {} at {} batay sa ibinigay na halimbawa.".format(*map(bare,pair())),
 lambda: f"Ano ang magiging output ng programa kung ang x ay {n(1,9)}?",
 lambda: f"Tukuyin ang sanhi ng {random.choice(['pagkabigo ng sistema','maling resulta','mabagal na network','error sa query'])} batay sa ibinigay na datos.",
],
"Evaluating": [
 lambda: f"Is {concept('it')} the best choice for {random.choice(SYSTEMS)}? Justify your answer.",
 lambda: "Which is more appropriate for {}: {} or {}? Defend your choice.".format(random.choice(SYSTEMS), *pair('it')),
 lambda: f"Evaluate the effectiveness of {concept()} in {random.choice(SYSTEMS)}.",
 lambda: f"Assess the strengths and weaknesses of the proposed {bare(random.choice(ARTIFACTS)) if random.random()<0.5 else 'solution'} for {random.choice(SYSTEMS)}.",
 lambda: f"Judge whether the given {random.choice(['proof','solution','argument','design','conclusion','policy'])} is {random.choice(['valid','acceptable','sound','fair','reasonable'])}, and explain your judgment.",
 lambda: f"Critique the given {random.choice(['essay','website','database design','user interface','research method','integration plan','algorithm'])}.",
 lambda: f"Recommend the most suitable {random.choice(['database','network setup','programming language','sorting algorithm','data format','backup strategy'])} for {random.choice(SYSTEMS)} and justify your recommendation.",
 lambda: f"Should {random.choice(SYSTEMS)} adopt {concept('it')}? Support your answer.",
 lambda: f"Do you agree that {concept()} is always beneficial? Defend your position.",
 lambda: f"Which of the proposed {random.choice(['solutions','designs','plans','policies','algorithms'])} is the most {random.choice(['efficient','cost-effective','secure','practical','fair'])}? Explain why.",
 lambda: f"Rank the given {random.choice(['options','proposals','passwords','algorithms','sources'])} from best to worst and justify your ranking.",
 lambda: f"Is the conclusion about {bare(concept())} supported by the evidence? Justify.",
 lambda: f"Decide whether it is ethical to {random.choice(['collect students location data','use AI to grade essays','monitor employees emails','share patient records with insurers','require biometric attendance'])}. Justify your decision.",
 lambda: f"Weigh the advantages and disadvantages of {concept()} and give your verdict.",
 lambda: f"How well does the proposed {random.choice(['system','design','schedule','budget'])} meet the needs of {random.choice(SYSTEMS)}? Justify your rating.",
 lambda: f"Pangatwiranan kung angkop ang {bare(concept('it'))} para sa {bare(random.choice(SYSTEMS))}.",
 lambda: f"Makatwiran ba ang paggamit ng {bare(concept())} sa {bare(random.choice(SYSTEMS))}? Ipaliwanag.",
 lambda: f"Tayahin ang bisa ng ibinigay na {random.choice(['solusyon','argumento','plano','disenyo'])}.",
 lambda: f"Alin ang mas mainam: {' o '.join(map(bare,pair('it')))}? Pangatwiranan ang iyong sagot.",
],
"Creating": [
 lambda: f"Design {random.choice(ARTIFACTS)} for {random.choice(SYSTEMS)}.",
 lambda: f"Create {random.choice(ARTIFACTS)} that helps {random.choice(SYSTEMS)} manage its records.",
 lambda: f"Develop {random.choice(ARTIFACTS)} for {random.choice(SYSTEMS)} and explain its main features.",
 lambda: f"Propose {random.choice(ARTIFACTS)} that would solve the record-keeping problem of {random.choice(SYSTEMS)}.",
 lambda: f"Plan an integration between {random.choice(SYSTEMS)} and {random.choice(SYSTEMS)} using web services.",
 lambda: f"Compose an original {random.choice(LIT)} about {random.choice(THEMES)}.",
 lambda: f"Write an original {random.choice(LIT)} about {random.choice(THEMES)}.",
 lambda: f"Formulate an original problem that uses {concept('dm')} and solve it.",
 lambda: f"Construct an original example that shows {concept()}.",
 lambda: f"Invent a game that teaches {bare(concept())} to students.",
 lambda: f"Devise an algorithm that {random.choice(['finds duplicate records','schedules exams without conflicts','recommends books to students','detects late payments','groups students by skill level'])}.",
 lambda: f"Draft a research proposal on {bare(concept())} in {random.choice(SYSTEMS)}.",
 lambda: f"Outline a lesson plan that teaches {bare(concept())}.",
 lambda: f"Build a prototype of {random.choice(ARTIFACTS)} for {random.choice(SYSTEMS)}.",
 lambda: f"Generate a new set of questions that assess understanding of {bare(concept())}.",
 lambda: f"Come up with a new way to explain {bare(concept())} to Grade 10 students.",
 lambda: f"Bumuo ng {random.choice(['programa','database','website','plano'])} para sa {bare(random.choice(SYSTEMS))}.",
 lambda: f"Lumikha ng orihinal na {random.choice(['tula','kuwento','sanaysay','awit'])} tungkol sa {random.choice(['kalikasan','pamilya','bayan','edukasyon','katapatan'])}.",
 lambda: f"Magdisenyo ng {random.choice(['app','website','sistema','poster'])} para sa {bare(random.choice(SYSTEMS))}.",
 lambda: f"Gumawa ng orihinal na problema tungkol sa {bare(concept('dm'))} at lutasin ito.",
],
}
PER = 420
rows=set()
for lvl, temps in T.items():
    got=0; tries=0
    while got<PER and tries<PER*20:
        tries+=1; q=random.choice(temps)()
        q=q[0].upper()+q[1:]
        if (lvl,q) in rows: continue
        rows.add((lvl,q)); got+=1
with open('data/generated.tsv','w') as f:
    for lvl,q in sorted(rows): f.write(f"{lvl}\t{q}\n")
from collections import Counter
print(Counter(l for l,_ in rows), len(rows))
