import AuthLayout from '../components/AuthLayout.jsx';
import AuthForm from '../components/AuthForm.jsx';

const AuthPage = ({ onSignupComplete, onLoginComplete }) => (
  <AuthLayout>
    <AuthForm onSignupComplete={onSignupComplete} onLoginComplete={onLoginComplete} />
  </AuthLayout>
);

export default AuthPage;
