import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { useInvestmentEvolution } from '../hooks/useInvestmentEvolution';
import { Timestamp } from 'firebase/firestore';
import './InvestmentChart.css';

// Función de formato de moneda (simplificada)
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP', 
        minimumFractionDigits: 0 
    }).format(value);
};


const InvestmentChart = () => {
    const { data, isLoading, error } = useInvestmentEvolution('user1');

    // Procesamiento de Datos (Memoizado para eficiencia)
    const processedData = useMemo(() => {
        console.log('Datos completos recibidos:', data);
        console.log('Claves disponibles en el documento:', data ? Object.keys(data) : []);
        
        // Acceder directamente al array de datos en la clave "array"
        const evolutionArray = data?.array;
        
        console.log('Array de evolución encontrado:', evolutionArray);

        if (!evolutionArray || !Array.isArray(evolutionArray) || evolutionArray.length === 0) {
            console.warn('No hay datos de evolución o el array está vacío');
            return { processed: [] };
        }
        
        // CORRECCIÓN CLAVE: Mapear la nueva estructura de datos
        try {
            const processed = evolutionArray
                .map((item, index) => {
                    let timestamp;
                    
                    // Manejar diferentes formatos de fecha de Firestore
                    if (item.date) {
                        if (item.date instanceof Timestamp) {
                            // Si es un Timestamp de Firestore, usar toMillis()
                            timestamp = item.date.toMillis();
                        } else if (item.date.seconds) {
                            // Si tiene la propiedad seconds (formato serializado)
                            timestamp = item.date.seconds * 1000 + (item.date.nanoseconds || 0) / 1000000;
                        } else if (item.date.toMillis) {
                            // Si tiene el método toMillis
                            timestamp = item.date.toMillis();
                        } else if (typeof item.date === 'number') {
                            // Si ya es un número (milisegundos)
                            timestamp = item.date;
                        } else {
                            console.warn(`Formato de fecha no reconocido en el índice ${index}:`, item.date);
                            return null;
                        }
                    } else {
                        console.warn(`Item sin fecha en el índice ${index}:`, item);
                        return null;
                    }
                    
                    // Obtener el valor del portafolio
                    const value = item.portfolioValue || item.value || item.amount || 0;
                    
                    if (value === 0 || value === null || value === undefined) {
                        console.warn(`Item sin valor válido en el índice ${index}:`, item);
                    }
                    
                    return [timestamp, value];
                })
                .filter(item => item !== null) // Filtrar items inválidos
                .sort((a, b) => a[0] - b[0]); // Asegurar el orden cronológico
            
            return { processed };
        } catch (error) {
            console.error('Error al procesar los datos:', error);
            return { processed: [] };
        }
    }, [data]);

    const chartData = processedData.processed || [];
    const lastValue = chartData.length > 0 
        ? chartData[chartData.length - 1][1] 
        : 0;

    // Configuración de Series y Opciones de ApexCharts
    const chartSeries = [{
        name: 'Valor del Portafolio',
        data: chartData
    }];

    const chartOptions = {
        chart: {
            id: 'realtime-investment-chart',
            type: 'area',
            toolbar: { 
                autoSelected: 'zoom', 
                tools: { 
                    zoom: true, 
                    pan: false, 
                    download: true 
                },
                show: true
            },
            zoom: {
                enabled: true
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800
            }
        },
        dataLabels: { enabled: false },
        stroke: { 
            curve: 'smooth', 
            width: 2, 
            colors: ['#18daae'],
            show: true
        },
        fill: {
            type: 'gradient',
            gradient: { 
                shadeIntensity: 1, 
                opacityFrom: 0.8, 
                opacityTo: 0.1, 
                stops: [0, 100],
                colorStops: [
                    {
                        offset: 0,
                        color: '#18daae',
                        opacity: 0.8
                    },
                    {
                        offset: 100,
                        color: '#18daae',
                        opacity: 0.1
                    }
                ]
            }
        },
        markers: {
            size: 0,
            colors: ['#18daae'],
            strokeColors: '#ffffff',
            strokeWidth: 2,
            hover: {
                size: 5,
                sizeOffset: 5
            },
            showNullDataPoints: false
        },
        xaxis: {
            type: 'datetime',
            labels: {
                style: {
                    colors: '#000000',
                    fontSize: '12px',
                    fontFamily: 'ProductSansRegular, sans-serif'
                }
            }
        },
        yaxis: {
            labels: { 
                formatter: (value) => formatCurrency(value),
                style: {
                    colors: '#000000',
                    fontSize: '12px',
                    fontFamily: 'ProductSansRegular, sans-serif'
                }
            }
        },
        tooltip: {
            enabled: true,
            shared: false,
            intersect: false,
            followCursor: true,
            theme: 'dark',
            style: {
                fontSize: '14px',
                fontFamily: 'ProductSansRegular, sans-serif',
                color: '#000000'
            },
            x: { 
                format: 'dd MMM yyyy',
                show: true
            },
            y: { 
                formatter: (value) => {
                    return formatCurrency(value);
                },
                title: {
                    formatter: () => 'Monto:'
                }
            },
            marker: {
                show: true,
                fillColors: ['#18daae']
            },
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                if (dataPointIndex === undefined || dataPointIndex < 0) {
                    return '';
                }
                
                const value = series[seriesIndex][dataPointIndex];
                const timestamp = w.globals.seriesX[seriesIndex][dataPointIndex];
                
                if (!timestamp || isNaN(timestamp)) {
                    return '';
                }
                
                const date = new Date(timestamp);
                if (isNaN(date.getTime())) {
                    return '';
                }
                
                const formattedDate = date.toLocaleDateString('es-CL', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                });
                const formattedValue = formatCurrency(value);
                
                return `
                    <div style="padding: 12px; background: #ffffff; border: 2px solid #18daae; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 180px;">
                        <div style="font-weight: 600; color: #000000; margin-bottom: 8px; font-size: 13px;">${formattedDate}</div>
                        <div style="font-size: 20px; font-weight: bold; color: #18daae;">${formattedValue}</div>
                    </div>
                `;
            }
        },
        theme: { mode: 'light' }
    };

    // Renderizado condicional
    if (isLoading) {
        return <div className="investment-portfolio loading-state">Cargando datos en tiempo real... ⏱️</div>;
    }

    if (error) {
        return <div className="investment-portfolio error-state">Error de conexión: {error}</div>;
    }

    if (!chartData.length) {
        
        return (
            <div className="investment-portfolio empty-state">
                <p>No se encontró información, perdón por las molestias :(</p>
            </div>
        );
    }

    // Componente principal del gráfico
    return (
        <div className="investment-portfolio">
            <h2 className="title">Evolución del Portafolio de Inversión</h2>
            
            <Chart 
                options={chartOptions} 
                series={chartSeries} 
                type="area" 
                height={350} 
            />

            <p className="last-update">
                Balance: <strong className="latest-value">{formatCurrency(lastValue)}</strong>
            </p>
        </div>
    );
};

export default InvestmentChart;