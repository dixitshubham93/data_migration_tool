const Dashboard = () => {

    
  return (
    <div className=" w-[80%] mx-auto bg-contain  bg-no-repeat bg-center min-h-[90vh] px-7 py-1.5">
      <div className="text-2xl xl:text-2xl lg:text-xl md:text-xl font-bold bg-slate-900">
        Dashboard
      </div>
      {/* inputs */}
      <div className="flex w-full gap-1">

        <div className="flex-1">
          <div className="text-xl  xl:text-xl lg:text-[15px] md:text-[15px]  text-center">
            Source
          </div>

          <div className="flex justify-center items-center  bg-gray-100">
      <form className="bg-white p-6 rounded-lg shadow-lg ">
        <h2 className="text-xl font-bold mb-4 text-center">Database Connection</h2>

        {/* Connection String Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Connection String</label>
          <input 
            type="text" 
            placeholder="Enter connection string"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Password</label>
          <input 
            type="password" 
            placeholder="Enter password"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Connect
        </button>
      </form>

           </div>
          
        </div>

        <div className="flex-1">

          <div className="text-xl  xl:text-xl lg:text-[15px] md:text-[15px]  text-center">
            Target
          </div>
          <div className="flex justify-center items-center  bg-gray-100">
      <form className="bg-white p-6 rounded-lg shadow-lg ">
        <h2 className="text-xl font-bold mb-4 text-center">Database Connection</h2>

        {/* Connection String Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Connection String</label>
          <input 
            type="text" 
            placeholder="Enter connection string"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password Input */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">Password</label>
          <input 
            type="password" 
            placeholder="Enter password"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Connect
        </button>
      </form>

    </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
