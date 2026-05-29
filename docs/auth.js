const PASSWORD_HASH = '3a50f6db6d5a7cae6d7fc35616330f055d4344b9a51ce0e85696eb2b2feb5efd';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const onLockPage = window.location.pathname.endsWith('lock.html');

if (!onLockPage && sessionStorage.getItem('salt_auth') !== 'true') {
  window.location.replace('/lock.html');
}

if (onLockPage) {
  document.getElementById('lockForm').addEventListener('submit', async e => {
    e.preventDefault();
    const hash = await sha256(document.getElementById('passwordInput').value);
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem('salt_auth', 'true');
      window.location.replace('/');
    } else {
      document.getElementById('lockError').textContent = 'Wrong password.';
    }
  });
}
