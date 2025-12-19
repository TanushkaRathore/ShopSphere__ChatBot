import "./App.css";
import ChatBot from "./components/ChatBot";
import EcommerceStore from "./components/EcommerceStore";
function App() {
  return (
    <div className="App">
      <EcommerceStore />
      <ChatBot/>
    </div>
  );
}

export default App;
