import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import image1 from '../assets/images/image1.png';

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Artificial delay for effect
        setTimeout(() => {
            if (email === "moonnight@sta.com" && password === "weareknight") {
                onLoginSuccess();
            } else {
                setError("Invalid credentials. Please try again.");
                setIsLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#1a0f0a] relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-600/30 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-600/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-500">

                    <div className="text-center mb-8 relative">
                        <div className="w-32 h-32 mx-auto mb-6 relative group">
                            <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <img
                                src={image1}
                                alt="Login Visual"
                                className="w-full h-full object-cover rounded-2xl shadow-2xl border-2 border-white/10 relative z-10 transform group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h1>
                        <p className="text-orange-200 text-sm font-medium">Secure Access Portal</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-orange-200 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="text-orange-300 group-focus-within:text-white transition-colors" size={20} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white/10 transition-all font-medium"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-orange-200 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="text-orange-300 group-focus-within:text-white transition-colors" size={20} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white/10 transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-100 text-sm text-center font-medium animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Sparkles className="animate-spin" size={20} />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <span>Access Dashboard</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-white/40 font-medium">Proprietary Software • Internal Use Only</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
