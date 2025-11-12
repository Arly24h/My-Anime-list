import { useEffect, useMemo, useState } from 'react';
import './Signup.css';

function validateEmail(email: string) {
  // Simple RFC2822-like regex; good enough for client-side hints
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
}

export default function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    return {
      email: email ? (validateEmail(email) ? '' : 'Enter a valid email') : 'Email is required',
      username: username
        ? username.length >= 3
          ? ''
          : 'Must be at least 3 characters'
        : 'Username is required',
      password: password
        ? password.length >= 8
          ? ''
          : 'Must be at least 8 characters'
        : 'Password is required',
      confirm: confirm
        ? confirm === password
          ? ''
          : 'Passwords do not match'
        : 'Please repeat the password',
    } as const;
  }, [email, username, password, confirm]);

  const isValid = Object.values(errors).every((errorText) => errorText === '');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ email: true, username: true, password: true, confirm: true });
    if (!isValid) return;
    // No backend yet — placeholder action
    console.log('Sign up form data', { email, username, password });
    setSubmitted(true);
  }

  useEffect(() => {
    if (submitted) {
      const id = setTimeout(() => setSubmitted(false), 3000);
      return () => clearTimeout(id);
    }
  }, [submitted]);

  return (
    <section className="auth">
      <div className="auth__panel">
        <h1 className="auth__title">Create your account</h1>
        <p className="auth__subtitle">Join to track what you watch and discover new favorites.</p>

        <form className="auth__form" onSubmit={onSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              aria-invalid={touched.email && !!errors.email}
              aria-describedby="email-error"
              required
            />
            {touched.email && errors.email ? (
              <div id="email-error" className="field-error" role="alert">
                {errors.email}
              </div>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
              aria-invalid={touched.username && !!errors.username}
              aria-describedby="username-error"
              required
              minLength={3}
            />
            {touched.username && errors.username ? (
              <div id="username-error" className="field-error" role="alert">
                {errors.username}
              </div>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              aria-invalid={touched.password && !!errors.password}
              aria-describedby="password-error"
              required
              minLength={8}
            />
            {touched.password && errors.password ? (
              <div id="password-error" className="field-error" role="alert">
                {errors.password}
              </div>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="confirm">Repeat password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
              aria-invalid={touched.confirm && !!errors.confirm}
              aria-describedby="confirm-error"
              required
              minLength={8}
            />
            {touched.confirm && errors.confirm ? (
              <div id="confirm-error" className="field-error" role="alert">
                {errors.confirm}
              </div>
            ) : null}
          </div>

          <button className="btn btn--primary" type="submit" disabled={!isValid}>
            Create account
          </button>

          <p className="auth__hint">
            By creating an account you agree to our Terms and Privacy Policy.
          </p>
        </form>

        {submitted ? <div className="toast">Signed up! (TODO: connect to backend)</div> : null}
      </div>
    </section>
  );
}
