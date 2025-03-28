
const Navbar=()=>
{
    return(
        <nav className=" py-2 bg-transparent flex justify-between align-middle ">
        <div className=" text-slate-200 text-2xl p-1.5 px-3.5 font-extrabold font-serif flex justify-around align-middle gap-1">
        <img src="./src/assests/logowebsite.svg" className="w-5 h-5 invert mt-1"></img>
        <div>Migrator</div>
        </div>
      </nav>
    )
}
export default Navbar;