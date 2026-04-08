'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, User, Lock, Smartphone, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useLoginModal } from '@/providers/LoginModal';
import { signupAction, checkUserAction, signinAction } from '@/app/(frontend)/actions/auth';

export const LoginModal: React.FC = () => {
  const { isLoginOpen, closeLoginModal, user, setUser } = useLoginModal();
  const [step, setStep] = useState<'login' | 'signup' | 'signin'>('login');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Signup/Signin Shared and Specific State
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRobotChecked, setIsRobotChecked] = useState(false);

  // If user is already logged in, we shouldn't show the login screen
  useEffect(() => {
    if (user && isLoginOpen) {
      closeLoginModal();
    }
  }, [user, isLoginOpen, closeLoginModal]);

  if (!isLoginOpen) return null;

  const validateInput = (val: string) => {
    const isPhone = /^\d{10}$/.test(val);
    const isEmail = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(val);
    return isPhone || isEmail;
  };

  const isInputValid = validateInput(email);

  const handleContinue = async () => {
    if (!isInputValid) return;
    
    setIsLoading(true);
    try {
      const result = await checkUserAction(email);
      if (result.exists) {
        setStep('signin');
      } else {
        setStep('signup');
      }
    } catch (error) {
      setStep('signup'); // Fallback to signup if check fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('login');
    setPassword('');
  };

  const handleSignin = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const result = await signinAction({ email, password });
      if (result.success) {
        setUser(result.user); // Set user state immediately
        alert("Logged in successfully!");
        closeLoginModal();
      } else {
        alert(result.error || "Login failed");
      }
    } catch (error) {
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!isRobotChecked || !fullName || !password) return;

    setIsLoading(true);
    try {
      const result = await signupAction({
        fullName,
        email,
        password,
        mobile,
      });

      if (result.success) {
        setUser(result.user); // Set user state immediately
        alert("Account created successfully!");
        closeLoginModal();
      } else {
        alert(result.error || "Signup failed");
      }
    } catch (error) {
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div 
        className={`login-sidebar-backdrop ${isLoginOpen ? 'open' : ''}`} 
        onClick={closeLoginModal}
      />
      
      <aside className={`login-sidebar ${isLoginOpen ? 'open' : ''}`}>
        <button className="login-close-btn" onClick={closeLoginModal} aria-label="Close login sidebar">
          <X size={24} />
        </button>

        <div className="login-sidebar-scroll-content">
          {step === 'login' ? (
            <>
              {/* Header */}
              <div className="login-sidebar-header">
                <div className="login-avatar-container">
                  <div className="login-avatar-circle">
                    <User size={42} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Social Logins */}
              <div className="login-social-section">
                <button 
                  className="social-login-btn google-btn"
                  onClick={() => {
                    alert("Simulating Google Login...");
                    closeLoginModal();
                  }}
                >
                  <svg className="social-icon" viewBox="0 0 48 48" width="24" height="24">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                  </svg>
                  <span className="btn-text">Sign in with Google</span>
                </button>

                <button 
                  className="social-login-btn apple-btn"
                  onClick={() => {
                    alert("Simulating Apple Login...");
                    closeLoginModal();
                  }}
                >
                  <svg className="social-icon" viewBox="0 0 384 512" width="20" height="20" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-31.4-97.3-65.2-97.7-111.9zM224 80c43.6-52.6 30-101.4 30-101.4s-43.1 3.5-84.8 54.1c-38.1 46-30.4 101.4-30.4 101.4s41.6.4 85.2-54.1z" />
                  </svg>
                  <span className="btn-text">Sign in with Apple</span>
                </button>
              </div>

              {/* Divider */}
              <div className="login-divider">
                <span className="divider-text">Or Go The Traditional Way</span>
              </div>

              {/* Traditional Logic */}
              <div className="login-form-section">
                <div className="login-input-wrapper">
                  <Mail className="input-icon" size={20} />
                  <input 
                    type="text" 
                    className="login-input" 
                    placeholder="Sign In/Sign Up with Email or Mobile No."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <p className="login-terms-text">
                  By signing in or creating an account, you agree with our{' '}
                  <a href="#" className="link">Terms & Conditions</a> and{' '}
                  <a href="#" className="link">Privacy Policy</a>.
                </p>

                <div className="login-checkbox-wrapper">
                  <label className="checkbox-label">
                    <input type="checkbox" className="newsletter-checkbox" defaultChecked />
                    <span className="checkbox-text">Yes, Subscribe to Dinasuvadu newsletters!</span>
                  </label>
                </div>

                <button 
                  className="login-continue-btn" 
                  onClick={handleContinue}
                  disabled={!isInputValid || isLoading}
                >
                  {isLoading ? "LOADING..." : "CONTINUE"}
                </button>

                <div className="login-footer">
                  <a href="#" className="forgot-password-link">FORGOT PASSWORD?</a>
                </div>
              </div>
            </>
          ) : step === 'signup' ? (
            <div className="signup-section">
              <div className="signup-header">
                <div className="signup-divider-line"></div>
                <h2 className="signup-title">Complete Your Profile</h2>
                <div className="signup-divider-line"></div>
              </div>

              <div className="signup-form">
                {/* Email (Static) */}
                <div className="login-input-wrapper static">
                  <Mail className="input-icon" size={20} />
                  <span className="static-email">{email || "c@dinasuvadu.com"}</span>
                </div>
                <button className="change-email-btn" onClick={handleChangeEmail}>
                  CHANGE EMAIL OR MOBILE NO.
                </button>

                {/* Full Name */}
                <div className="login-input-wrapper">
                  <User className="input-icon" size={20} />
                  <input 
                    type="text" 
                    className="login-input" 
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div className="login-input-wrapper">
                  <Lock className="input-icon" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="login-input" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="login-input-wrapper">
                  <Lock className="input-icon" size={20} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="login-input" 
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button className="eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Mobile */}
                <div className="login-input-wrapper">
                  <Smartphone className="input-icon" size={20} />
                  <div className="mobile-input-container">
                    <span className="mobile-prefix">+91 -</span>
                    <input 
                      type="text" 
                      className="login-input mobile-input" 
                      placeholder="Mobile Number (Optional)"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </div>
                </div>

                {/* Interactive reCAPTCHA */}
                <div 
                  className={`recaptcha-placeholder ${isRobotChecked ? 'checked' : ''}`}
                  onClick={() => setIsRobotChecked(!isRobotChecked)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="recaptcha-box">
                    <div className="recaptcha-check">
                      {isRobotChecked && <div className="checkmark-icon"></div>}
                    </div>
                    <span className="recaptcha-text">I'm not a robot</span>
                  </div>
                  <div className="recaptcha-branding">
                    <RefreshCw size={24} className="recaptcha-logo" />
                    <span className="recaptcha-brand-text">reCAPTCHA</span>
                  </div>
                </div>

                <p className="login-terms-text">
                  By signing in or creating an account, you agree with our{' '}
                  <a href="#" className="link">Terms & Conditions</a> and{' '}
                  <a href="#" className="link">Privacy Policy</a>.
                </p>

                <button 
                  className="login-continue-btn"
                  onClick={handleUpdate}
                  disabled={!isRobotChecked || !fullName || !password || isLoading}
                >
                  {isLoading ? "UPDATING..." : "UPDATE"}
                </button>
              </div>
            </div>
          ) : (
            <div className="signin-section">
              <div className="signup-header">
                <div className="signup-divider-line"></div>
                <h2 className="signup-title">Sign In</h2>
                <div className="signup-divider-line"></div>
              </div>

              <div className="login-social-section">
                <button 
                  className="social-login-btn google-btn"
                  onClick={() => {
                    alert("Simulating Google Login...");
                    closeLoginModal();
                  }}
                >
                  <svg className="social-icon" viewBox="0 0 48 48" width="24" height="24">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                  </svg>
                  <span className="btn-text">Sign in with Google</span>
                </button>

                <button 
                  className="social-login-btn apple-btn"
                  onClick={() => {
                    alert("Simulating Apple Login...");
                    closeLoginModal();
                  }}
                >
                  <svg className="social-icon" viewBox="0 0 384 512" width="20" height="20" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-31.4-97.3-65.2-97.7-111.9zM224 80c43.6-52.6 30-101.4 30-101.4s-43.1 3.5-84.8 54.1c-38.1 46-30.4 101.4-30.4 101.4s41.6.4 85.2-54.1z" />
                  </svg>
                  <span className="btn-text">Sign in with Apple</span>
                </button>
              </div>

              <div className="login-divider">
                <span className="divider-text">Or Go The Traditional Way</span>
              </div>

              <div className="login-form-section">
                <div className="login-input-wrapper">
                  <Mail className="input-icon" size={20} />
                  <input 
                    type="text" 
                    className="login-input static-input" 
                    value={email}
                    readOnly
                  />
                </div>
                
                <button className="change-email-btn" onClick={handleChangeEmail}>
                  CHANGE EMAIL OR MOBILE NO.
                </button>

                <div className="login-input-wrapper mt-6">
                  <Lock className="input-icon" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="login-input" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <button className="otp-link-btn" onClick={() => alert("OTP Feature Coming Soon")}>
                  GENERATE OTP TO LOGIN
                </button>

                <p className="login-terms-text">
                  By signing in or creating an account, you agree with our{' '}
                  <a href="#" className="link">Terms & Conditions</a> and{' '}
                  <a href="#" className="link">Privacy Policy</a>.
                </p>

                <div className="login-checkbox-wrapper">
                  <label className="checkbox-label">
                    <input type="checkbox" className="newsletter-checkbox" defaultChecked />
                    <span className="checkbox-text">Yes, Subscribe to Dinasuvadu newsletters!</span>
                  </label>
                </div>

                <button 
                  className="login-continue-btn"
                  onClick={handleSignin}
                  disabled={!password || isLoading}
                >
                  {isLoading ? "SIGNING IN..." : "SIGN IN"}
                </button>

                <div className="login-footer">
                  <button className="forgot-password-link-btn" onClick={() => alert("Forgot Password Feature Coming Soon")}>
                    FORGOT PASSWORD?
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
