export default function Header() {
  return (
    <div className="header">
      <div className="header-title">
        <div className="header-logo">Rx</div>
        <div>
          <h1>Adult Vaccine Advisor</h1>
          <p>Pneumococcal &middot; Meningococcal &middot; ACIP/immunize.org 2025</p>
        </div>
      </div>
      <span className="header-badge">HCP Use Only</span>
    </div>
  );
}
