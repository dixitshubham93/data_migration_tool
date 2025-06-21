import { Source_input } from "./Source_input";
import { Target_input } from "./Target_input";

const Dashboard = () => {

    
  return (
    <div className=" w-[80%] mx-auto bg-contain  bg-no-repeat bg-center min-h-[90vh] px-7 py-1.5">
      <div className="text-2xl xl:text-2xl lg:text-xl md:text-xl font-bold bg-slate-900">
        Dashboard
      </div>
      {/* inputs */}
      <div className="flex w-full gap-1">

        <Source_input/>
        <Target_input/>
        

      </div>
    </div>
  );
};
export default Dashboard;
