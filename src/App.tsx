import "./App.css";
import LoginPage from "./components/LoginPage";

function App() {
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
          <p className="text-xl text-muted-foreground">
            Start building your amazing project here!
          </p>
        </div>
      </div>
      <LoginPage />
    </>
  );
}

export default App;
