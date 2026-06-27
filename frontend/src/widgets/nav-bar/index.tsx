import { NavLink } from 'react-router-dom';
import './styles.css';

export const NavBar = () => (
  <nav className="navbar">
    <div className="navbar__inner">
      <div className="navbar__brand">
        <div className="navbar__logo">B</div>
        <div>
          <div className="navbar__name">Bahandi</div>
          <div className="navbar__sub">Loss Intelligence</div>
        </div>
      </div>

      <div className="navbar__links">
        <NavLink to="/" end className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>
          Дашборд
        </NavLink>
        <NavLink to="/reviewer" className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>
          Проверка
          <span className="navbar__badge">4</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>
          История
        </NavLink>
      </div>
    </div>
  </nav>
);
