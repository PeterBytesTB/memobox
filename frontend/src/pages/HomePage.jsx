function HomePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#121212',
        color: '#eaeaea',
        padding: 20,
        textAlign: 'center',
      }}
    >
      <h1>Bem-vindo ao Memobox</h1>
      <p>O chat seguro, privado e criptografado para você.</p>

      <div style={{ marginTop: 30 }}>
        <button
          onClick={() => (window.location.href = '/login')}
          style={{
            marginRight: 10,
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 5,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#00a884',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          Entrar
        </button>

        <button
          onClick={() => (window.location.href = '/register')}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            borderRadius: 5,
            border: '2px solid #00a884',
            backgroundColor: 'transparent',
            color: '#00a884',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Cadastrar
        </button>
      </div>
    </div>
  )
}

export default HomePage
