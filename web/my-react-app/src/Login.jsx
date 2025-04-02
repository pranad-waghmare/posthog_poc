import React, { useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { logEvent, AnalyticsEvent } from "./analytics/event";

const LoginScreen = () => {
  useEffect(() => {
    logEvent(AnalyticsEvent.UserIdentity(uuidv4()));
    logEvent(AnalyticsEvent.ScreenView("LoginScreen"));
    
  }, []);

  const handleLoginClick = () => {
    logEvent(AnalyticsEvent.ButtonClick("login_button", "Login Button", {
        Action: "Login_Initiated"
    }));
  };

  return (
    <div style={styles.container}>
      <h1>Login</h1>
      <button  data-ph-capture-attribute-button-id="login_button"
    data-ph-capture-attribute-button-name="Login Button" onClick={handleLoginClick} style={styles.button}>
        Login
      </button>
    </div>
  );
};

const styles = {
  container: { display: "flex", flexDirection: "column", alignItems: "center", marginTop: "50px" },
  button: { padding: "10px 20px", fontSize: "16px", cursor: "pointer" },
};

export default LoginScreen;
