import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Modal, 
  SafeAreaView, BackHandler, Alert, ScrollView, ActivityIndicator 
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const TakeTestScreen = ({ route, navigation }: any) => {
  const { testData } = route.params || {};
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeLeft, setTimeLeft] = useState((testData?.duration || 30) * 60);
  const [submitModal, setSubmitModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentIndex];

  const calculateScoreAndSubmit = () => {
    let correct = 0;
    questions.forEach((q: any, i: number) => {
      if (answers[i] === q.correctAnswer) correct++;
    });
    setScore(Math.round((correct / questions.length) * 100) || 0);
    setSubmitModal(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    const isPassed = score >= 40; // Passing criteria
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultCard}>
            {/* 🌟 Color logic: Red if low, Green if high */}
            <View style={[styles.successIcon, { backgroundColor: isPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                <MaterialIcons name={isPassed ? "check" : "close"} size={30} color={isPassed ? "#10B981" : "#EF4444"}/>
            </View>
            <Text style={styles.resultTitle}>Test Submitted!</Text>
            <Text style={[styles.scoreText, { color: isPassed ? '#10B981' : '#EF4444' }]}>{score}%</Text>
            
            {/* 🌟 Stats Summary */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}><Text style={styles.statVal}>{questions.length}</Text><Text style={styles.statLabel}>Total</Text></View>
                <View style={[styles.statBox, {borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#334155'}]}><Text style={styles.statVal}>{Object.keys(answers).length}</Text><Text style={styles.statLabel}>Answered</Text></View>
                <View style={styles.statBox}><Text style={styles.statVal}>{questions.length - Object.keys(answers).length}</Text><Text style={styles.statLabel}>Skipped</Text></View>
            </View>

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'Tests' })}>
                <Text style={{color: '#FFF', fontWeight: 'bold'}}>Back to Main Tab</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ... (Header and Question rendering remains same as before) */}
      <View style={styles.header}>
         <Text style={styles.headerTitle}>{testData.title}</Text>
         <Text style={{color: '#FFF'}}>{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}</Text>
      </View>
      
      <ScrollView style={styles.mainArea}>
          <Text style={styles.questionText}>Q{currentIndex + 1}: {currentQuestion?.questionText}</Text>
          {currentQuestion?.options?.map((opt: string, i: number) => (
              <TouchableOpacity 
                 key={i} 
                 style={[styles.optionBtn, answers[currentIndex] === opt && styles.optionBtnSelected]}
                 onPress={() => setAnswers({...answers, [currentIndex]: opt})}
              >
                  <Text style={{color: '#FFF'}}>{opt}</Text>
              </TouchableOpacity>
          ))}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footerNav}>
          <TouchableOpacity disabled={currentIndex === 0} onPress={() => setCurrentIndex(prev => prev - 1)}><Text style={{color:'#FFF'}}>Prev</Text></TouchableOpacity>
          {currentIndex === questions.length - 1 ? (
              <TouchableOpacity style={styles.submitBtn} onPress={() => setSubmitModal(true)}><Text style={{color:'#FFF'}}>Submit</Text></TouchableOpacity>
          ) : (
              <TouchableOpacity onPress={() => setCurrentIndex(prev => prev + 1)}><Text style={{color:'#FFF'}}>Next</Text></TouchableOpacity>
          )}
      </View>

      {/* Confirmation Modal */}
      <Modal visible={submitModal} transparent={true}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={{color:'#FFF', marginBottom: 10}}>Confirm Submission?</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statBox}><Text style={styles.statVal}>{questions.length}</Text><Text style={styles.statLabel}>Total</Text></View>
                    <View style={[styles.statBox, {borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#334155'}]}><Text style={styles.statVal}>{Object.keys(answers).length}</Text><Text style={styles.statLabel}>Answered</Text></View>
                    <View style={styles.statBox}><Text style={styles.statVal}>{questions.length - Object.keys(answers).length}</Text><Text style={styles.statLabel}>Skipped</Text></View>
                </View>
                <View style={{flexDirection: 'row', marginTop: 20}}>
                    <TouchableOpacity onPress={() => setSubmitModal(false)}><Text style={{color:'#94A3B8', marginRight: 20}}>Continue</Text></TouchableOpacity>
                    <TouchableOpacity onPress={calculateScoreAndSubmit}><Text style={{color:'#3B82F6', fontWeight:'bold'}}>Yes, Submit</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E293B' },
  headerTitle: { color: '#FFF', fontWeight: 'bold' },
  mainArea: { flex: 1, padding: 20 },
  questionText: { color: '#FFF', fontSize: 18, marginBottom: 20 },
  optionBtn: { padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  optionBtnSelected: { backgroundColor: '#3B82F6' },
  footerNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#1E293B' },
  submitBtn: { backgroundColor: '#10B981', padding: 10, borderRadius: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1E293B', padding: 30, borderRadius: 10, width: '80%' },
  resultCard: { padding: 30, alignItems: 'center', marginTop: 50 },
  successIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  resultTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scoreText: { fontSize: 48, fontWeight: '900', marginVertical: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 8, paddingVertical: 15, width: '100%' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statLabel: { color: '#94A3B8', fontSize: 10 },
  backBtn: { backgroundColor: '#4338CA', width: '100%', paddingVertical: 14, alignItems: 'center', borderRadius: 8, marginTop: 20 }
});

export default TakeTestScreen;