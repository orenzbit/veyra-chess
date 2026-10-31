// Synthetic test fixture to ensure Code Guardian accurately catches security hazards
const apiKey = 'api_key: "ab12cd34ef56gh78ij90kl12mn34op56"';
const gitUrl = 'https://bot:secret123@github.com/repo.git';
const badRegex = /(a+)+b/;

function runUnsafe(code) {
  eval(code);
}
