import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import UV_Login from '@/components/views/UV_Login';
import { useAppStore } from '@/store/main';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Auth E2E Flow (real API)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        auth_token: null,
        current_user: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: false,
        },
        error_message: null,
      },
    }));
  });

  it('full auth flow: register -> logout -> sign-in', async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const uniqueEmail = `user${Date.now()}@example.com`;
    const password = 'TestPassword123';
    const fullName = 'Test User E2E';

    const user = userEvent.setup();

    const registerResponse = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password,
        full_name: fullName,
        phone_number: null,
        profile_picture_url: null,
      }),
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      throw new Error(
        `Registration failed (${registerResponse.status}): ${errorText}. ` +
        `Make sure backend server is running at ${API_BASE_URL}`
      );
    }

    const registerData = await registerResponse.json();
    expect(registerData.auth_token).toBeTruthy();
    expect(registerData.user.email).toBe(uniqueEmail);
    expect(registerData.user.full_name).toBe(fullName);

    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        auth_token: registerData.auth_token,
        current_user: registerData.user,
        authentication_status: {
          is_authenticated: true,
          is_loading: false,
        },
        error_message: null,
      },
    }));

    await waitFor(() => {
      const stateAfterRegister = useAppStore.getState();
      expect(stateAfterRegister.authentication_state.authentication_status.is_authenticated).toBe(true);
      expect(stateAfterRegister.authentication_state.auth_token).toBeTruthy();
      expect(stateAfterRegister.authentication_state.current_user?.email).toBe(uniqueEmail);
    });

    const logoutAction = useAppStore.getState().logout_user;
    logoutAction();

    await waitFor(() => {
      const stateAfterLogout = useAppStore.getState();
      expect(stateAfterLogout.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(stateAfterLogout.authentication_state.auth_token).toBeNull();
      expect(stateAfterLogout.authentication_state.current_user).toBeNull();
    });

    render(<UV_Login />, { wrapper: Wrapper });

    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/^password$/i);
    const submitButton = await screen.findByRole('button', { name: /log in/i });

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    await user.clear(emailInput);
    await user.type(emailInput, uniqueEmail);

    await user.clear(passwordInput);
    await user.type(passwordInput, password);

    await waitFor(() => expect(submitButton).not.toBeDisabled());

    await user.click(submitButton);

    await waitFor(
      () => {
        const submitButtonText = submitButton.textContent?.toLowerCase() || '';
        expect(
          submitButtonText.includes('logging in')
        ).toBe(true);
      },
      { timeout: 5000 }
    );

    await waitFor(
      () => {
        const stateAfterSignIn = useAppStore.getState();
        expect(stateAfterSignIn.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(stateAfterSignIn.authentication_state.auth_token).toBeTruthy();
        expect(stateAfterSignIn.authentication_state.current_user?.email).toBe(uniqueEmail);
      },
      { timeout: 20000 }
    );
  }, 35000);
});
