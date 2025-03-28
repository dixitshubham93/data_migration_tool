import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
function App() {
  
  return (
    <div className=" m-0 p-0 text-slate-200 font-serif">
    <div className="bg-[url('https://chroniclehq.com/images/bg-website-min.png')] w-full h-[100vh]  bg-no-repeat bg-center bg-cover bg-contain">
      <Navbar/>
      <Dashboard  /> 
    </div>
    </div>
  )
}

export default App
