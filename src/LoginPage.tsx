import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { customerAPI } from './api';

interface LoginPageProps {
    onLoginSuccess: (customerData: any) => void;
}

const strengthConfig = {
    weak:   { label: 'Weak',   color: 'bg-red-500',    text: 'text-red-400' },
    fair:   { label: 'Fair',   color: 'bg-orange-400', text: 'text-orange-400' },
    good:   { label: 'Good',   color: 'bg-yellow-400', text: 'text-yellow-400' },
    strong: { label: 'Strong', color: 'bg-emerald-500',text: 'text-emerald-400' },
};

const getPasswordStrength = (password: string) => {
    const checks = {
        length:    password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number:    /[0-9]/.test(password),
        special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    const level: keyof typeof strengthConfig = passed <= 1 ? 'weak' : passed <= 3 ? 'fair' : passed === 4 ? 'good' : 'strong';
    return { checks, passed, level };
};

const blank6 = (): string[] => ['', '', '', '', '', ''];

const OtpInput: React.FC<{ otp: string[]; onChange: (otp: string[]) => void }> = ({ otp, onChange }) => {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const handleChange = (i: number, val: string) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...otp]; next[i] = val; onChange(next);
        if (val && i < 5) refs.current[i + 1]?.focus();
    };
    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
    };
    return (
        <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
                <input key={i} ref={el => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-black bg-slate-900/50 border-2 border-white/10 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white" />
            ))}
        </div>
    );
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

    // ── Login form state ──
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [isLoadingLogin, setIsLoadingLogin] = useState(false);
    const [loginError, setLoginError] = useState('');

    // ── Login verify step state ──
    const [loginStep, setLoginStep] = useState<'form' | 'verify'>('form');
    const [pendingEmail, setPendingEmail] = useState('');
    const [loginOtp, setLoginOtp] = useState<string[]>(blank6());
    const [loginOtpError, setLoginOtpError] = useState('');
    const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
    const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
    const [loginResendCooldown, setLoginResendCooldown] = useState(0);

    // ── Signup form state ──
    const [signupData, setSignupData] = useState({ name: '', username: '', email: '', number: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
    const [phoneOtp, setPhoneOtp] = useState<string[]>(blank6());
    const [otpError, setOtpError] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    React.useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    React.useEffect(() => {
        if (loginResendCooldown <= 0) return;
        const t = setTimeout(() => setLoginResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [loginResendCooldown]);

    const strength = getPasswordStrength(signupData.password || '');
    const sConfig = strengthConfig[strength.level];

    // ── Login functions ──
    const doLogin = async () => {
        if (!loginUsername || !loginPassword) return;
        setIsLoadingLogin(true);
        setLoginError('');
        try {
            const res = await customerAPI.loginCustomer({ username: loginUsername, password: loginPassword });
            onLoginSuccess(res.data.user || res.data);
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.requires_verification && data?.email) {
                setPendingEmail(data.email);
                setLoginOtp(blank6());
                setLoginOtpError('');
                setLoginStep('verify');
                setLoginResendCooldown(60);
            } else {
                setLoginError(data?.error || data?.detail || 'Invalid username or password.');
            }
        } finally {
            setIsLoadingLogin(false);
        }
    };

    const verifyAndLogin = async () => {
        const entered = loginOtp.join('');
        if (entered.length < 6) { setLoginOtpError('Enter the full 6-digit code.'); return; }
        setIsVerifyingLogin(true);
        try {
            const res = await customerAPI.verifyAccount({ email: pendingEmail, otp: entered });
            onLoginSuccess(res.data);
        } catch (err: any) {
            setLoginOtpError(err.response?.data?.error || 'Invalid or expired code.');
        } finally {
            setIsVerifyingLogin(false);
        }
    };

    const resendLoginOtp = async () => {
        setIsSendingLoginOtp(true);
        try {
            await customerAPI.sendOtp(pendingEmail);
            setLoginResendCooldown(60);
        } catch {}
        finally { setIsSendingLoginOtp(false); }
    };

    const resetLoginToForm = () => {
        setLoginStep('form');
        setLoginOtp(blank6());
        setLoginOtpError('');
        setPendingEmail('');
        setLoginError('');
    };

    // ── Signup functions ──
    const sendOtp = async () => {
        if (!signupData.name || !signupData.username || !signupData.email || !signupData.number || !signupData.password) {
            alert('Please fill in all fields before continuing.');
            return;
        }
        setIsSending(true);
        try {
            await customerAPI.sendOtp(signupData.email);
            setPhoneOtp(blank6()); setOtpError(''); setSignupStep('otp'); setResendCooldown(60);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to send verification email.');
        } finally {
            setIsSending(false);
        }
    };

    const verifyOtp = async () => {
        const entered = phoneOtp.join('');
        if (entered.length < 6) { setOtpError('Please enter the full 6-digit code.'); return; }
        setIsVerifying(true);
        try {
            await customerAPI.signupWithOtp({ ...signupData, otp: entered });
            setOtpError('');
            setSignupData({ name: '', username: '', email: '', number: '', password: '' });
            setSignupStep('form');
            setAuthMode('login');
            alert('Account created! Please log in.');
        } catch (err: any) {
            setOtpError(err.response?.data?.error || 'Incorrect or expired code.');
        } finally {
            setIsVerifying(false);
        }
    };

    const resetSignupToForm = () => { setSignupStep('form'); setPhoneOtp(blank6()); setOtpError(''); };

    const switchMode = (mode: 'login' | 'signup') => {
        setAuthMode(mode);
        resetLoginToForm();
        resetSignupToForm();
    };

    const inputClass = "w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500";
    const labelClass = "block text-xs font-black text-white/50 uppercase tracking-widest mb-2";

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative font-sans overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center scale-105"
                 style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')` }} />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-[#1a1b3a]/90 to-slate-950/95 backdrop-blur-[2px]" />

            <div className="relative z-10 w-full max-w-md px-4 py-4">
                <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-500 rounded-[14px] flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                            <span className="text-white font-black text-2xl">G</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">G-Stop</h1>
                    </div>
                    <p className="text-white/60 font-bold text-sm tracking-widest uppercase">The One-Stop Shop For Gamers</p>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1e1f3a]/60 backdrop-blur-xl border border-white/10 rounded-[20px] sm:rounded-[30px] p-5 sm:p-8 shadow-2xl relative overflow-hidden">

                    <div className="flex mb-8 bg-slate-900/50 p-1 rounded-xl">
                        <button type="button" onClick={() => switchMode('login')}
                            className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all uppercase tracking-widest ${authMode === 'login' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
                            Login
                        </button>
                        <button type="button" onClick={() => switchMode('signup')}
                            className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all uppercase tracking-widest ${authMode === 'signup' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
                            Sign Up
                        </button>
                    </div>

                    {/* ══ LOGIN — FORM ══ */}
                    {authMode === 'login' && loginStep === 'form' && (
                        <div className="space-y-5">
                            <div>
                                <label className={labelClass}>Username</label>
                                <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)}
                                    className={inputClass} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="Enter username" />
                            </div>
                            <div>
                                <label className={labelClass}>Password</label>
                                <div className="relative">
                                    <input type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                                        className={inputClass} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="••••••••" />
                                    <button type="button" onClick={() => setShowLoginPassword(p => !p)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase">
                                        {showLoginPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                            <AnimatePresence>
                                {loginError && (
                                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="text-center text-xs font-black text-red-400 bg-red-500/10 py-2 rounded-lg">
                                        ⚠ {loginError}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                            <div className="pt-4">
                                <button type="button" onClick={doLogin} disabled={isLoadingLogin}
                                    className="w-full bg-indigo-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-indigo-400 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                    {isLoadingLogin ? 'Authenticating...' : 'Secure Login'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══ LOGIN — VERIFY (inactive account) ══ */}
                    {authMode === 'login' && loginStep === 'verify' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <button type="button" onClick={resetLoginToForm} className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                <span>←</span> Back
                            </button>
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 mb-2">
                                    <span className="text-amber-400 text-xs font-black uppercase tracking-widest">Account Not Verified</span>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">Verify Your Email</h3>
                                <p className="text-sm text-white/50 font-bold">Code sent to <span className="text-indigo-400">{pendingEmail}</span></p>
                            </div>
                            <OtpInput otp={loginOtp} onChange={setLoginOtp} />
                            <AnimatePresence>
                                {loginOtpError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs font-black text-red-400 bg-red-500/10 py-2 rounded-lg">⚠ {loginOtpError}</motion.p>}
                            </AnimatePresence>
                            <div className="text-center">
                                {loginResendCooldown > 0 ? (
                                    <span className="text-xs font-black text-white/30 uppercase tracking-widest">Resend in {loginResendCooldown}s</span>
                                ) : (
                                    <button type="button" onClick={resendLoginOtp} disabled={isSendingLoginOtp}
                                        className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest disabled:opacity-50">
                                        {isSendingLoginOtp ? 'Sending...' : 'Resend Code'}
                                    </button>
                                )}
                            </div>
                            <div className="pt-2">
                                <button type="button" onClick={verifyAndLogin} disabled={isVerifyingLogin}
                                    className="w-full bg-indigo-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-indigo-400 active:scale-[0.98] transition-all disabled:opacity-50">
                                    {isVerifyingLogin ? 'Verifying...' : 'Verify & Login'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ══ SIGN UP — FORM ══ */}
                    {authMode === 'signup' && signupStep === 'form' && (
                        <div className="space-y-4 max-h-[55vh] sm:max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div>
                                <label className={labelClass}>Full Name</label>
                                <input type="text" value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Username</label>
                                <input type="text" value={signupData.username} onChange={e => setSignupData({...signupData, username: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Email</label>
                                <input type="email" value={signupData.email} onChange={e => setSignupData({...signupData, email: e.target.value})} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Phone Number</label>
                                <div className="flex gap-2">
                                    <span className="flex items-center px-4 bg-slate-900/50 border border-white/10 rounded-xl text-sm font-black text-white/50">+63</span>
                                    <input type="text" value={signupData.number} onChange={e => setSignupData({...signupData, number: e.target.value.replace(/\D/g, '')})} placeholder="9XXXXXXXXX" className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Password</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} className={inputClass} />
                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {signupData.password && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex gap-1">
                                            {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.passed ? sConfig.color : 'bg-white/10'}`} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="pt-4">
                                <button type="button" onClick={sendOtp} disabled={isSending}
                                    className="w-full bg-emerald-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                    {isSending ? 'Sending Code...' : 'Create Account'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══ SIGN UP — OTP ══ */}
                    {authMode === 'signup' && signupStep === 'otp' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <button type="button" onClick={resetSignupToForm} className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                                <span>←</span> Back
                            </button>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-black text-white tracking-tight">Verify Email</h3>
                                <p className="text-sm text-white/50 font-bold">Code sent to <span className="text-indigo-400">{signupData.email}</span></p>
                            </div>
                            <OtpInput otp={phoneOtp} onChange={setPhoneOtp} />
                            <AnimatePresence>
                                {otpError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-xs font-black text-red-400 bg-red-500/10 py-2 rounded-lg">⚠ {otpError}</motion.p>}
                            </AnimatePresence>
                            <div className="text-center">
                                {resendCooldown > 0 ? (
                                    <span className="text-xs font-black text-white/30 uppercase tracking-widest">Resend in {resendCooldown}s</span>
                                ) : (
                                    <button type="button" onClick={sendOtp} disabled={isSending}
                                        className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest disabled:opacity-50">
                                        {isSending ? 'Sending...' : 'Resend Code'}
                                    </button>
                                )}
                            </div>
                            <div className="pt-2">
                                <button type="button" onClick={verifyOtp} disabled={isVerifying}
                                    className="w-full bg-emerald-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50">
                                    {isVerifying ? 'Verifying...' : 'Complete Signup'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
