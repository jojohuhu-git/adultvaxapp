import { useState } from 'react';
import Header from './components/Header.jsx';
import FormPanel from './components/FormPanel.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import { analyzeVaccineStatus } from './engine/analyzeEngine.js';
import './App.css';

export default function App() {
  const [age, setAge] = useState('');
  const [immunoRisks, setImmunoRisks] = useState(new Set());
  const [otherRisks, setOtherRisks] = useState(new Set());
  const [pneuHistory, setPneuHistory] = useState([]);
  const [meningHistory, setMeningHistory] = useState([]);
  const [results, setResults] = useState(null);
  const [formError, setFormError] = useState('');

  function handleAnalyze() {
    if (!age) {
      setFormError('Please select a patient age first.');
      setTimeout(() => setFormError(''), 4000);
      return;
    }
    setFormError('');

    const ageNum = parseInt(age);
    const allRisks = new Set([...immunoRisks, ...otherRisks]);

    const analysisResults = analyzeVaccineStatus(ageNum, allRisks, pneuHistory, meningHistory);
    setResults({ ...analysisResults, age: ageNum });
  }

  return (
    <>
      <Header />
      <div className="app">
        <FormPanel
          age={age}
          setAge={setAge}
          immunoRisks={immunoRisks}
          setImmunoRisks={setImmunoRisks}
          otherRisks={otherRisks}
          setOtherRisks={setOtherRisks}
          pneuHistory={pneuHistory}
          setPneuHistory={setPneuHistory}
          meningHistory={meningHistory}
          setMeningHistory={setMeningHistory}
          onAnalyze={handleAnalyze}
          formError={formError}
        />
        <ResultsPanel
          results={results}
          pneuHistory={pneuHistory}
          meningHistory={meningHistory}
        />
      </div>
    </>
  );
}
