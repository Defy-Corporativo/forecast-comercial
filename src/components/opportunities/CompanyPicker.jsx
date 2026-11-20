import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Trash, Building2, ChevronDown } from 'lucide-react';
import { opportunityService } from '../../services/opportunityService';
import styles from './Opportunities.module.css';

// Empresas padrão: sempre aparecem e não podem ser excluídas
const DEFAULT_COMPANIES = ['Defy', 'Austera'];

const normalize = (text) => text.trim().toLocaleLowerCase('pt-BR');

/**
 * Campo de empresa responsável no padrão das tags:
 * escolhe uma empresa já usada, cria nova digitando, remove com o "x"
 * e exclui das sugestões uma empresa digitada errada.
 */
const CompanyPicker = ({ id, value, onChange }) => {
    const [companies, setCompanies] = useState([]);
    const [input, setInput] = useState('');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    const loadCompanies = () => {
        opportunityService.getCompanies()
            .then(setCompanies)
            .catch(error => console.error('Erro ao carregar empresas:', error));
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
                setInput('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = useMemo(() => {
        const byName = new Map();
        DEFAULT_COMPANIES.forEach(name => byName.set(normalize(name), { name, count: 0, isDefault: true }));
        companies.forEach(company => {
            const key = normalize(company.name);
            const existing = byName.get(key);
            byName.set(key, existing
                ? { ...existing, count: existing.count + company.count }
                : { ...company, isDefault: false });
        });
        const all = [...byName.values()];
        const query = normalize(input);
        return all
            .filter(option => !query || normalize(option.name).includes(query))
            .sort((a, b) => (b.isDefault - a.isDefault) || a.name.localeCompare(b.name, 'pt-BR'));
    }, [companies, input]);

    const trimmedInput = input.trim();
    const canCreate = Boolean(trimmedInput) && !options.some(option => normalize(option.name) === normalize(trimmedInput));
    // Itens navegáveis por teclado: sugestões + "criar"
    const itemCount = options.length + (canCreate ? 1 : 0);

    const select = (name) => {
        onChange(name.trim());
        setInput('');
        setOpen(false);
    };

    const clear = () => {
        onChange('');
        setOpen(true);
        setHighlight(0);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleDelete = async (option, event) => {
        event.stopPropagation();
        const usage = option.count === 1
            ? 'Ela está em 1 oportunidade, que ficará sem empresa.'
            : option.count > 1
                ? `Ela está em ${option.count} oportunidades, que ficarão sem empresa.`
                : '';
        if (!window.confirm(`Excluir a empresa "${option.name}" da lista? ${usage}`.trim())) return;
        try {
            await opportunityService.removeCompany(option.name);
            if (value && normalize(value) === normalize(option.name)) onChange('');
            loadCompanies();
        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            window.alert('Não foi possível excluir a empresa. Tente novamente.');
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlight(h => Math.min(h + 1, Math.max(itemCount - 1, 0)));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight(h => Math.max(h - 1, 0));
        } else if (event.key === 'Enter') {
            if (!open && !trimmedInput) return;
            event.preventDefault();
            if (highlight < options.length && options[highlight]) select(options[highlight].name);
            else if (canCreate) select(trimmedInput);
        } else if (event.key === 'Escape') {
            if (open) {
                event.stopPropagation();
                setOpen(false);
            }
        }
    };

    return (
        <div ref={wrapperRef} className={styles.companyPicker}>
            {value ? (
                <div className={styles.companyField}>
                    <span className={styles.companyChip}>
                        <Building2 size={14} aria-hidden="true" />
                        {value}
                        <button type="button" onClick={clear} aria-label={`Remover empresa ${value}`} title="Trocar empresa">
                            <X size={13} />
                        </button>
                    </span>
                </div>
            ) : (
                <div
                    className={`${styles.companyField} ${open ? styles.companyFieldOpen : ''}`}
                    onClick={() => { setOpen(true); inputRef.current?.focus(); }}
                >
                    <input
                        ref={inputRef}
                        id={id}
                        type="text"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={`${id}-options`}
                        aria-autocomplete="list"
                        autoComplete="off"
                        value={input}
                        placeholder="Selecione ou digite"
                        onFocus={() => setOpen(true)}
                        onChange={(e) => { setInput(e.target.value); setOpen(true); setHighlight(0); }}
                        onKeyDown={handleKeyDown}
                    />
                    <ChevronDown size={16} className={styles.companyCaret} aria-hidden="true" />
                </div>
            )}

            {open && !value && (
                <ul id={`${id}-options`} role="listbox" className={styles.companyMenu}>
                    {options.map((option, index) => (
                        <li
                            key={option.name}
                            role="option"
                            aria-selected={highlight === index}
                            className={highlight === index ? styles.companyOptionActive : undefined}
                            onMouseEnter={() => setHighlight(index)}
                            onMouseDown={(e) => { e.preventDefault(); select(option.name); }}
                        >
                            <span className={styles.companyOptionName}>{option.name}</span>
                            {option.count > 0 && (
                                <span className={styles.companyOptionCount}>{option.count}</span>
                            )}
                            {!option.isDefault && (
                                <button
                                    type="button"
                                    className={styles.companyDelete}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => handleDelete(option, e)}
                                    aria-label={`Excluir empresa ${option.name}`}
                                    title="Excluir empresa (digitada errada)"
                                >
                                    <Trash size={13} />
                                </button>
                            )}
                        </li>
                    ))}
                    {canCreate && (
                        <li
                            role="option"
                            aria-selected={highlight === options.length}
                            className={`${styles.companyCreate} ${highlight === options.length ? styles.companyOptionActive : ''}`}
                            onMouseEnter={() => setHighlight(options.length)}
                            onMouseDown={(e) => { e.preventDefault(); select(trimmedInput); }}
                        >
                            <Plus size={14} /> Criar empresa “{trimmedInput}”
                        </li>
                    )}
                    {!canCreate && options.length === 0 && (
                        <li className={styles.companyEmpty} aria-disabled="true">Nenhuma empresa encontrada.</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default CompanyPicker;
