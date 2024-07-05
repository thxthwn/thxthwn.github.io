const facts = ["1", "2", "3"];

!function newFact() {
  const randomFact = Math.floor(Math.random() * facts.length);
  document.getElementById('factDisplay').innerHTML = facts[randomFact];
}();