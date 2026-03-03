import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import API_URL from './config';
import './Auth.css';

const STARS = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    duration: `${2 + Math.random() * 3}s`,
    delay: `${Math.random() * 4}s`,
    size: `${2 + Math.random() * 2}px`,
}));

const bouncy = { type: 'spring', damping: 12, stiffness: 150, mass: 0.6 };
const extraBouncy = { type: 'spring', damping: 8, stiffness: 200, mass: 0.4 };

export default function Signup({ onLogin }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            return setError('Passwords do not match.');
        }
        if (password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Auto-login after signup
            const loginRes = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
                localStorage.setItem('debate-user', JSON.stringify(loginData.user));
                onLogin(loginData.user);
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="stars-container">
                {STARS.map((s) => (
                    <div
                        key={s.id}
                        className="star"
                        style={{
                            top: s.top, left: s.left,
                            width: s.size, height: s.size,
                            '--duration': s.duration, '--delay': s.delay,
                        }}
                    />
                ))}
            </div>

            <div className="planet-container">
                <div className="planet" />
                <div className="planet-ring planet-ring-1" />
                <div className="planet-ring planet-ring-2" />
                <div className="planet-ring planet-ring-3" />
            </div>

            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={bouncy}
            >
                <h1>Create Account</h1>
                <p className="subtitle">Join the AI Debate Chamber</p>

                {error && <div className="auth-message error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label>Name</label>
                        <motion.input
                            whileFocus={{ scale: 1.01 }}
                            transition={bouncy}
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Email</label>
                        <motion.input
                            whileFocus={{ scale: 1.01 }}
                            transition={bouncy}
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Password</label>
                        <motion.input
                            whileFocus={{ scale: 1.01 }}
                            transition={bouncy}
                            type="password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-field">
                        <label>Confirm Password</label>
                        <motion.input
                            whileFocus={{ scale: 1.01 }}
                            transition={bouncy}
                            type="password"
                            placeholder="Re-enter your password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        transition={extraBouncy}
                        type="submit"
                        disabled={loading}
                        className="auth-btn auth-btn-primary"
                    >
                        <UserPlus size={16} />
                        {loading ? 'Creating...' : 'Create Account'}
                    </motion.button>
                </form>

                <div className="auth-links">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </motion.div>
        </div>
    );
}
