import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { Button, Form, Input, Alert, Spin } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const onFinish = async ({ email, password }) => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Authenticate with Firebase
      const { user, adminData } = await login(email, password);
      
      // 2. Check if email is verified
      if (!user.emailVerified) {
        throw new Error('Please verify your email before logging in');
      }
      
      // 3. Check admin privileges
      if (!adminData) {
        throw new Error('Not authorized as admin');
      }
      
      // 4. Redirect to dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/admin-logo.png" alt="Admin Logo" />
          <h2>Admin Portal</h2>
        </div>
        
        {error && (
          <Alert message={error} type="error" showIcon closable />
        )}

        <Form
          name="admin-login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Invalid email format' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="Admin Email" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              size="large"
              loading={loading}
            >
              {loading ? <Spin /> : 'Log In'}
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <a href="/admin/forgot-password">Forgot password?</a>
          <span>•</span>
          <a href="/admin/request-access">Request admin access</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;