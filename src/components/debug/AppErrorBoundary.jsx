import React from 'react';

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        this.setState({ info });
        // eslint-disable-next-line no-console
        console.error('App crashed:', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '32px', maxWidth: '720px', margin: '40px auto', color: '#0F172A' }}>
                    <h2 style={{ marginTop: 0 }}>Algo deu errado</h2>
                    <p style={{ marginBottom: '16px' }}>
                        Ocorreu um erro ao renderizar a página. Clique para recarregar ou copie os detalhes abaixo.
                    </p>
                    <button className="btn btn-primary" onClick={this.handleReload}>Recarregar</button>
                    <pre
                        style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}
                    >
                        {this.state.error?.toString()}
                        {'\n'}
                        {this.state.info?.componentStack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AppErrorBoundary;
