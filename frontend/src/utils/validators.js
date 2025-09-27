// Reusable validation utilities

// Email RFC 5322-light regex (practical version)
export function isValidEmail(email) {
  if (!email) return false;
  const re = /^(?:[a-zA-Z0-9_'^&+%*\-]+(?:\.[a-zA-Z0-9_'^&+%*\-]+)*)@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return re.test(String(email).trim());
}

// Username: 3-20 chars, letters, numbers, underscores, dots; cannot start/end with dot/underscore; no consecutive . or _
export function isValidUsername(username) {
  if (!username) return false;
  const u = String(username).trim();
  if (u.length < 3 || u.length > 20) return false;
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9._]*[a-zA-Z0-9])?$/.test(u)) return false;
  if (/[._]{2,}/.test(u)) return false; // no consecutive . or _
  return true;
}

// Password strength: 8+ chars, at least one lower, upper, digit, special
export function isStrongPassword(pwd) {
  if (!pwd) return false;
  const s = String(pwd);
  const lengthOK = s.length >= 8;
  const upper = /[A-Z]/.test(s);
  const lower = /[a-z]/.test(s);
  const digit = /\d/.test(s);
  const special = /[^A-Za-z0-9]/.test(s);
  return lengthOK && upper && lower && digit && special;
}

// Provide issues list for UX if needed
export function getPasswordIssues(pwd) {
  const issues = [];
  if (!pwd || pwd.length < 8) issues.push('at least 8 characters');
  if (!/[A-Z]/.test(pwd)) issues.push('an uppercase letter');
  if (!/[a-z]/.test(pwd)) issues.push('a lowercase letter');
  if (!/\d/.test(pwd)) issues.push('a number');
  if (!/[^A-Za-z0-9]/.test(pwd)) issues.push('a special character');
  return issues;
}
