export default function HomePage() {
  return (
    <section>
      <h1>Cesta Digital</h1>
      <p>Sistema da UPG para gestão social, estoque e entregas.</p>

      <div className="cards">
        <div className="card">Famílias ativas</div>
        <div className="card">Cestas disponíveis</div>
        <div className="card">Entregas do mês</div>
        <div className="card">Reavaliações próximas</div>
      </div>
    </section>
  );
}