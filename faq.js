document.addEventListener('DOMContentLoaded', () => {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isVisible = !answer.classList.contains('hidden');

            // Optional: Close all other answers
            // document.querySelectorAll('.faq-answer').forEach(ans => {
            //     ans.classList.add('hidden');
            // });

            if (!isVisible) {
                answer.classList.remove('hidden');
            } else {
                answer.classList.add('hidden');
            }
        });
    });
});
