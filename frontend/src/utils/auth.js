// Standalone Authentication & Session Utility for ZHASTAR

const USER_STORAGE_KEY = "zhastar_portal_user";

export const getLoggedInUser = () => {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // In case of corrupt JSON, clean up
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }
  return null;
};

export const setLoggedInUser = (user) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const logout = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  window.location.reload();
};

export const isLoggedIn = () => {
  return getLoggedInUser() !== null;
};

export const getAuthHeader = () => {
  const user = getLoggedInUser();
  if (user && user.id) {
    return {
      "Authorization": `Bearer ${user.id}`
    };
  }
  return {};
};

export const getAuthToken = () => {
  const user = getLoggedInUser();
  return user ? String(user.id) : "";
};
