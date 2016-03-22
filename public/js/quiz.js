$(document).ready(function(){
    var $quizSelection = $("#quizSelection"),
        $quizBox = $("#quizBox"),
        $networkError = $(".network-error"),
        $modalTemplate = $("#modal-template"),
        chosenAnswer,
        quizData;

    $( "a.quiz-select" ).click( function( event ) {
        var data = $(this).data('quiz');
        event.preventDefault();
        $.post( "/quiz-select", {'data': data} )
        .done( function( data ) {
            if(data.error || !data.questions || !data.questions["1"] || !data.questions["1"].question) {
                data.message = data.message || "invalid response";
                data.subMessage = data.subMessage || "Unfortunately the response somehow malformed, sorry for the inconveniences";
                invalidRequest(data.message, data.subMessage);
                return;
            }
            quizData = data;
            showQuizBox(data);
        })
        .fail( function() {
            $networkError.removeClass("hidden");
            setTimeout(function(){ $networkError.addClass("hidden"); }, 2500);
        });
    });

    $( ".show-high-score" ).click( function( event ) {
        event.preventDefault();
        showHighScore();
    });

    $quizBox.find(".well").click( function( event ) {
        $quizBox.find(".well").removeClass("selected");
        $(this).addClass("selected");
        chosenAnswer = $(this).data("answer-letter");
    });

    $( ".submit" ).click( function() {
        if(!chosenAnswer) {
            $quizBox.find(".well").addClass("hovered");
            setTimeout(function(){ $quizBox.find(".well").removeClass("hovered"); }, 2500);
            return;
        }

        $.post( "/submit", {'data': chosenAnswer} )
        .done( function( data ) {
            updateScore(data);
            handleNextRound(data);
        })
        .fail( function() {
            $networkError.removeClass("hidden");
            setTimeout(function(){ $networkError.addClass("hidden"); }, 2500);
        });
    });

    $( ".give-up" ).click( function() {

    });

    $( ".exit-anyway" ).click( function() {
        $quizSelection.removeClass("hidden");
        $quizBox.addClass("hidden");
    });

    function invalidRequest(message, subMessage) {
        $modalTemplate.find(".modal-title").text(message);
        if (subMessage) { $modalTemplate.find(".modal-body").text(subMessage); }
        $modalTemplate.modal('show');
    }

    function showQuizBox(data, questionIndex) {
        questionIndex = questionIndex || "1";
        if (!data.questions[questionIndex]) {
            showHighScore();
            return;
        }
        $quizBox.find(".well").removeClass("hidden");
        $quizBox.find(".well").removeClass("selected");
        $quizBox.find(".question").text(data.questions[questionIndex].question);
        if (data.questions[questionIndex].a)  {
            $quizBox.find(".answer-a").text(data.questions[questionIndex].a);
        } else {
            $quizBox.find(".answer-a").parents(".well").addClass("hidden");
        }
        if (data.questions[questionIndex].b)  {
            $quizBox.find(".answer-b").text(data.questions[questionIndex].b);
        } else {
            $quizBox.find(".answer-b").parents(".well").addClass("hidden");
        }
        if (data.questions[questionIndex].c)  {
            $quizBox.find(".answer-c").text(data.questions[questionIndex].c);
        } else {
            $quizBox.find(".answer-c").parents(".well").addClass("hidden");
        }
        if (data.questions[questionIndex].d)  {
            $quizBox.find(".answer-d").text(data.questions[questionIndex].c);
        } else {
            $quizBox.find(".answer-d").parents(".well").addClass("hidden");
        }
        $quizSelection.addClass("hidden");
        $quizBox.removeClass("hidden");
    }
    function handleNextRound(data) {
        if (data.gameFinished) {
            showHighScore();
            return;
        }
        updateQuizBox(data);
    }

    function updateQuizBox(data) {
        showQuizBox(quizData, data.questionIndex);
    }

    function updateScore(data) {
        $userScore = $(".user-score");
        $userScore.text(Number($userScore.val()) + Number(data.scoreUp));
    }

    function showHighScore() {
        $modalTemplate.find(".modal-title").text("High Score");
        $modalTemplate.find(".modal-body").text("Under Construction");
        $modalTemplate.modal('show');
    }
});