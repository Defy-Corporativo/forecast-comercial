import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import styles from './Auth.module.css';

const Login = () => {
    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard} style={{ maxWidth: 420 }}>
                <SignIn
                    routing="path"
                    path="/login"
                    redirectUrl="/"
                    signInFallbackRedirectUrl="/"
                    appearance={{
                        elements: {
                            card: { boxShadow: 'none' },
                            footer: { display: 'none' },
                            footerAction: { display: 'none' },
                            footerActionText: { display: 'none' },
                            footerActionLink: { display: 'none' },
                        },
                    }}
                    localization={{
                        signIn: {
                            start: {
                                footerTitle: '',
                                footerActionText: '',
                                secondaryAction__signUp: '',
                            },
                        },
                    }}
                >
                    <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Apenas contas com domínio defysolutions.com.br são permitidas.
                    </div>
                </SignIn>
            </div>
        </div>
    );
};

export default Login;
