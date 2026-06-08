const MOCK_KEY = "mico-dev-auth";
const DEV_USER = "admin";
const DEV_PASS = "admin";

export function isDevEnvironment(): boolean {
  return import.meta.env.DEV;
}

export function isDevMockEnabled(): boolean {
  return isDevEnvironment();
}

export function tryDevLogin(username: string, password: string): boolean {
  if (!isDevMockEnabled()) return false;
  if (username === DEV_USER && password === DEV_PASS) {
    sessionStorage.setItem(MOCK_KEY, "1");
    return true;
  }
  return false;
}

export function isDevMockSession(): boolean {
  return isDevMockEnabled() && sessionStorage.getItem(MOCK_KEY) === "1";
}

export function clearDevMockSession(): void {
  sessionStorage.removeItem(MOCK_KEY);
}

export const DEV_CREDENTIALS_HINT = `${DEV_USER} / ${DEV_PASS}`;
