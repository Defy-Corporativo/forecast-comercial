import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useStageContext } from '../../contexts/StageContext';
import styles from './Opportunities.module.css';

// Fix para React 18 StrictMode com @hello-pangea/dnd
const StrictModeDroppable = ({ children, ...props }) => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true));
        return () => {
            cancelAnimationFrame(animation);
            setEnabled(false);
        };
    }, []);

    if (!enabled) {
        return null;
    }

    return <Droppable {...props}>{children}</Droppable>;
};

const OpportunityKanban = ({ opportunities, onView, onEdit, onStageChange }) => {
    const { stages } = useStageContext();

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // Get stage names from context
    const stageNames = stages.map(s => s.name);

    // Group opportunities by stage
    const columns = stageNames.reduce((acc, stage) => {
        acc[stage] = opportunities.filter(opp => opp.stage === stage);
        return acc;
    }, {});

    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const newStage = destination.droppableId;
        onStageChange(draggableId, newStage);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className={styles.kanbanContainer}>
                {stages.map(stage => (
                    <div key={stage.id || stage.name} className={styles.kanbanColumn}>
                        <div
                            className={styles.columnHeader}
                            title={stage.description || ''}
                        >
                            <span>{stage.name}</span>
                            <span className={styles.columnCount}>{columns[stage.name].length}</span>
                        </div>
                        <StrictModeDroppable droppableId={stage.name}>
                            {(provided) => (
                                <div
                                    className={styles.columnContent}
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {columns[stage.name].map((opp, index) => (
                                        <Draggable key={opp.id} draggableId={opp.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    className={styles.kanbanCard}
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => onView(opp)}
                                                >
                                                    <div className={styles.cardHeader}>
                                                        <span>{opp.opportunity_number}</span>
                                                        <span>{formatDate(opp.forecast_date)}</span>
                                                    </div>
                                                    <div className={styles.cardTitle}>{opp.title || opp.client?.name || opp.client_name}</div>
                                                    <div className={styles.cardClient}>{opp.client?.name || opp.client_name}</div>
                                                    <div className={styles.cardValue}>{formatCurrency(opp.estimated_value)}</div>
                                                    <div className={styles.cardFooter}>
                                                        <span>{opp.responsible || 'Sem responsável'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </StrictModeDroppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
};

export default OpportunityKanban;
