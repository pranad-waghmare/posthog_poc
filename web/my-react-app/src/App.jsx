import { initAnalytics } from "./analytics/event";
import LoginScreen from "./Login";
import { useEffect } from "react";


function App() {

  useEffect(() => {
    initAnalytics("test_fiu_id_web1");

  }, [])

  return (
    <LoginScreen />
  )
}

export default App
