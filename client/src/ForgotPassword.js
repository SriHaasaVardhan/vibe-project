import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle } from 'lucide-react';
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

export default function ForgotPassword({ onLogin }) {
    const [step, setStep] = useState(1); // 1 = email, 2 = otp
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const sendOtp = async () => {
        setError('');
        setSuccess('');
        if (!email) return setError('Please enter your email.');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess('OTP sent! Check the server terminal for the code.');
            setStep(2);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
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
                <h1>Forgot Password</h1>
                <p className="subtitle">We'll send an OTP to verify your identity</p>

                {error && <div className="auth-message error">{error}</div>}
                {success && <div className="auth-message success">{success}</div>}

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={bouncy}
                        >
                            <div className="auth-field">
                                <label>Email Address</label>
                                <motion.input
                                    whileFocus={{ scale: 1.01 }}
                                    transition={bouncy}
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                transition={extraBouncy}
                                onClick={sendOtp}
                                disabled={loading}
                                className="auth-btn auth-btn-primary"
                            >
                                <Send size={16} />
                                {loading ? 'Sending...' : 'Send OTP'}
                            </motion.button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.form
                            key="step2"
                            onSubmit={verifyOtp}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={bouncy}
                        >
                            <div className="auth-field">
                                <label>Enter OTP</label>
                                <motion.input
                                    whileFocus={{ scale: 1.01 }}
                                    transition={bouncy}
                                    type="text"
                                    placeholder="6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength={6}
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
                                <CheckCircle size={16} />
                                {loading ? 'Verifying...' : 'Verify & Sign In'}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                transition={extraBouncy}
                                type="button"
                                onClick={sendOtp}
                                className="auth-btn auth-btn-secondary"
                            >
                                Resend OTP
                            </motion.button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="auth-links">
                    <Link to="/login">← Back to login</Link>
                </div>
            </motion.div>
        </div>
    );
}
