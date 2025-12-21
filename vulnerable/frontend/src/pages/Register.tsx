import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../services/axiosInstance";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    // Client-side validations
    if (!trimmedUsername || !trimmedEmail || !password) {
      toast.error("Tous les champs sont requis.");
      return;
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      toast.error("Le nom d'utilisateur doit contenir entre 3 et 30 caractères.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Adresse email invalide.");
      return;
    }

    const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)/;
    if (password.length < 8 || !passwordRegex.test(password)) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.");
      return;
    }

    axiosInstance
      .post("/auth/register", { username: trimmedUsername, email: trimmedEmail, password })
      .then(() => {
        toast.success("Votre compte a été créé avec succès, veuillez vous connecter.");
        navigate("/login");
      })
      .catch((error: any) => {
        console.error("Registration failed:", error);
        // prefer server error message if available
        const serverError = error.response?.data?.error || (error.response?.data?.errors && error.response.data.errors.map((e: any) => e.msg).join(', '));
        toast.error(serverError || "Une erreur s'est produite lors de l'inscription.");
      });
  };

  return (
    <div className="main-bg p-4 flex">
      <div className="flex justify-center items-center h-auto flex-1">
        <div className="card w-96 backdrop-blur-sm bg-white/60">
          <div className="card-body">
            <h2 className="card-title">Inscription au blog</h2>
            <form onSubmit={handleRegister}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Nom d'utilisateur</span>
                </label>
                <input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  className="input input-bordered"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  className="input input-bordered"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Mot de passe</span>
                </label>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  className="input input-bordered"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="form-control mt-6">
                <button type="submit" className="btn btn-primary">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage