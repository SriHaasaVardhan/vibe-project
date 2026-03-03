import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
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

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            localStorage.setItem('debate-user', JSON.stringify(data.user));
            onLogin(data.user);
            navigate('/');
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            {/* Stars */}
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

            {/* Animated Planet */}
            <div className="planet-container">
                <div className="planet" />
                <div className="planet-ring planet-ring-1" />
                <div className="planet-ring planet-ring-2" />
                <div className="planet-ring planet-ring-3" />
            </div>

            {/* Login Card */}
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={bouncy}
            >
                <h1>Welcome Back</h1>
                <p className="subtitle">Sign in to your AI Debate Chamber</p>

                {error && <div className="auth-message error">{error}</div>}

                <form onSubmit={handleSubmit}>
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
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                        <LogIn size={16} />
                        {loading ? 'Signing in...' : 'Sign In'}
                    </motion.button>
                </form>

                <div className="auth-links">
                    <Link to="/forgot-password">Forgot password?</Link>
                    <br /><br />
                    Don't have an account? <Link to="/signup">Create one now</Link>
                </div>
            </motion.div>
        </div>
    );
}
