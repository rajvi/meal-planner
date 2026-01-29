import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // useEffect(() => {
  //   if (!user) {
  //     navigate("/signin");
  //   }
  // }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin");
  };

  if (!user) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Welcome, {user.email}</h1>
      <button onClick={handleLogout} className="btn">
        Log Out
      </button>
    </div>
  );
}
