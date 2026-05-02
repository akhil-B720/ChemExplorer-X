export function initialChatMessage() {
  return "Hi! I am ChemExplorer AI. Ask me about chirality, mechanisms, or JEE/BITSAT chemistry prep.";
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
