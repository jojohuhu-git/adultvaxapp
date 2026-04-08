import { useState, useRef, useEffect } from 'react';
import { MS_LABELS } from '../constants/vaccineData.js';

export default function MultiSelect({ id, options, selected, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleToggle(e) {
    e.stopPropagation();
    setIsOpen(!isOpen);
  }

  function handleCheck(value, e) {
    e.stopPropagation();
    const newSelected = new Set(selected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    onChange(newSelected);
  }

  const hasValue = selected.size > 0;

  return (
    <div className="multi-select" ref={ref} onClick={handleToggle}>
      <div className={`ms-display${hasValue ? ' has-value' : ''}`}>
        {hasValue
          ? [...selected].map(v => (
              <span key={v} className="ms-tag">{MS_LABELS[v] || v}</span>
            ))
          : placeholder || 'Tap to select conditions\u2026'
        }
      </div>
      <div className={`ms-dropdown${isOpen ? ' open' : ''}`} onClick={e => e.stopPropagation()}>
        {options.map(opt => (
          <label key={opt.value} className="ms-item" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected.has(opt.value)}
              onChange={(e) => handleCheck(opt.value, e)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
