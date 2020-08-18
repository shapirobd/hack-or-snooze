$(async function () {
	//
	// ***************
	// ** SELECTORS **
	// ***************
	//

	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $("#all-articles-list");
	const $submitForm = $("#submit-form");
	const $filteredArticles = $("#filtered-articles");
	const $loginForm = $("#login-form");
	const $createAccountForm = $("#create-account-form");
	const $ownStories = $("#my-articles");
	const $navLogin = $("#nav-login");
	const $navLogOut = $("#nav-logout");
	const $navLoginOptions = $("#nav-login-options");
	const $navSubmit = $("#nav-submit");
	const $navEditUser = $("#nav-edit-user");
	const $createStoryForm = $("#submit-form");
	const $createStoryAuthor = $("#author");
	const $createStoryTitle = $("#title");
	const $createStoryUrl = $("#url");
	const $allFavoritesList = $("#favorited-articles");
	const $navFavorites = $("#nav-favorites");
	const $myStoriesList = $("#my-articles");
	const $navMyStories = $("#nav-my-stories");
	const $profileName = $("#profile-name");
	const $profileUsername = $("#profile-username");
	const $profileCreatedDate = $("#profile-account-date");
	const $editArticleForm = $("#edit-article-form");
	const $editAuthorInput = $("#edit-author");
	const $editTitleInput = $("#edit-title");
	const $editUrlInput = $("#edit-url");
	const $editUserForm = $("#edit-user-form");
	const $editNameInput = $("#edit-name");
	const $editPasswordInput = $("#edit-password");

	// elements that are used by the hideElements function
	const elementsToHide = [
		$submitForm,
		$allStoriesList,
		$filteredArticles,
		$ownStories,
		$loginForm,
		$createAccountForm,
		$allFavoritesList,
		$editArticleForm,
		$editUserForm,
	];

	//
	// *******************************
	// ** REUSABLE/REPEATING MARKUP **
	// *******************************
	//

	// markup for a trashcan that corresponds to a story submitted by the user that can be deleted
	let trashMarkup = `
	<div class="trash">
		<i class="fas fa-trash"></i>
	</div>`;

	// markup for a star that corresponds to a story that has not been favorited
	let emptyStarMarkup = `
	<div class="star">
		<i class="far fa-star"></i>
	</div>`;

	// markup for a star that corresponds to a favorited story
	let solidStarMarkup = `
	<div class="star">
		<i class="fas fa-star"></i>
	</div>`;

	// markup for a pencil that corresponds to a user's story
	let pencilMarkup = `
	<div class="pencil">
		<i class="fas fa-edit"></i>
	</div>`;

	//
	// **********************
	// ** GLOBAL VARIABLES **
	// **********************
	//

	// boolean value that represents whether or not a user's name, username & created time/date
	// are shown in the user profile section
	let profileInfoShown = false;

	// boolean value that represents whether or not a user's name or password have been updatede
	// - used in the loadProfileInfo function
	let profileInfoUpdated = false;

	// global storyList variable
	let storyList = null;

	// global favoriteList variable
	let favoriteList = null;

	// global currentUser variable
	let currentUser = null;

	// global variable that represents the story most recently prompted to be updated via pencil pencil click.
	// - implemented to prevent issues when clicking a pencil twice or immediately changing which story you are
	// editting
	let storyBeingEditted = {};

	//
	// *****************************************************
	// ** FUNCTIONS RELATED TO LOGGING IN / CREATING USER **
	// *****************************************************
	//

	await checkIfLoggedIn();

	// On page load, checks local storage to see if the user is already logged in. Renders page information accordingly.
	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem("token");
		const username = localStorage.getItem("username");
		// if there is a token in localStorage, call User.getLoggedInUser
		// to get an instance of User with the right details
		// this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		generateStories();
		if (currentUser) {
			showNavForLoggedInUser();
		}
	}

	// returns an object that contains the name, username & password from the text inputs in the
	// update-user form
	// - used in the 'submit' listener for $createAccountForm
	function newUserInfo() {
		return {
			name: $("#create-account-name").val(),
			username: $("#create-account-username").val(),
			password: $("#create-account-password").val(),
		};
	}

	// A rendering function to run to reset the forms and hide the login info
	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();
		// reset those forms
		$loginForm.trigger("reset");
		$createAccountForm.trigger("reset");
		// show the stories
		generateStories();
		// append user's name, username & created time/date to the DOM
		loadProfileInfo();
		$allStoriesList.show();
		// update the navigation bar
		showNavForLoggedInUser();
	}

	// loads user profile info (name, username, and created date/time)
	async function loadProfileInfo() {
		if (profileInfoShown === false || profileInfoUpdated === true) {
			$profileName.find("b").empty().append(` ${currentUser.name}`);
			$profileUsername.find("b").empty().append(` ${currentUser.username}`);
			$profileCreatedDate.find("b").empty().append(` ${currentUser.createdAt}`);
			profileInfoShown = true;
		}
		// update the list of stories to show which are the user's favorites
		let stories = $("ol li");
		await showFavorites(stories);
	}

	// updates the navigation bar to include:
	// - the options to submit a story, show favorites & show user's stories
	// - the user's username
	// - the option to logout
	function showNavForLoggedInUser() {
		$navLogin.hide();
		$("#nav-welcome").show();
		$("#nav-user-profile").append(`${localStorage.username}`);
		$navLoginOptions.css("display", "inline-block");
		$navLoginOptions.show();
		$navLogOut.show();
	}

	// sync current user information to localStorage
	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem("token", currentUser.loginToken);
			localStorage.setItem("username", currentUser.username);
		}
	}

	// hide all elements in elementsArr
	function hideElements(exception) {
		elementsToHide.forEach(($elem) => {
			if ($elem !== exception) {
				$elem.hide();
			}
		});
		$createStoryForm.addClass("hidden");
	}

	//
	// *************************************
	// ** FUNCTIONS RELATED TO URL SYNTAX **
	// *************************************
	//

	// simple function to pull the hostname from a URL
	function getHostName(url) {
		let hostName;
		if (url.indexOf("://") > -1) {
			hostName = url.split("/")[2];
		} else {
			hostName = url.split("/")[0];
		}
		if (hostName.slice(0, 4) === "www.") {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	// ensures that both url's being checked end with a '/'
	// - * I was unable to favorite certain stories because their url in storyList
	//   * either ended or did not end with a '/' whereas their url in the API was the opposite
	function makeBothEndWithSlash(url1, url2) {
		if (url1.slice(-1) !== "/" && url2.slice(-1) === "/") {
			url1 = url1.concat("/");
		} else if (url1.slice(-1) === "/" && url2.slice(-1) !== "/") {
			url2 = url2.concat("/");
		}
		return [url1, url2];
	}

	// checks to see if the URL from the story being created matches a URL from a story that
	// already exists (this prevents duplicate storyId's, which affects the ability to delete stories)
	function isDuplicateUrl() {
		let matchFound = false;
		storyList.stories.map((story) => {
			if (matchFound === false) {
				if (story.url === $createStoryUrl.val()) {
					matchFound = true;
				}
			}
		});
		return matchFound;
	}

	//
	// ****************************
	// ** NAVBAR CLICK LISTENERS **
	// ****************************
	//

	// event handler for clicking 'logout'
	// Event handler for Navigation to Homepage
	$("body").on("click", "#nav-all", async function () {
		hideElements();
		generateStories();
		$allStoriesList.show();
	});

	$navLogOut.on("click", function () {
		// empty out local storage
		localStorage.clear();
		// hide the login navbar options
		$navLoginOptions.hide();
		// refresh the page, clearing memory
		location.reload();
	});

	// event handler for clicking 'login'
	$navLogin.on("click", function () {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	// event handler for clicking 'submit'
	$navSubmit.on("click", function () {
		// submit a new story
		if ($createStoryForm.hasClass("hidden")) {
			hideElements($allStoriesList);
			$createStoryForm.slideToggle();
			$createStoryForm.removeClass("hidden");
		} else {
			$createStoryForm.slideToggle();
			$createStoryForm.addClass("hidden");
		}
	});

	// event handler for clicking 'favorites'
	$navFavorites.on("click", async function () {
		// show all favorites
		hideElements();
		await generateFavorites();
		$allFavoritesList.toggle();
		$createStoryForm.addClass("hidden");
	});

	// event handler for clicking 'my stories'
	$navMyStories.on("click", async function () {
		hideElements();
		generateMyStories();
		$myStoriesList.toggle();
		$createStoryForm.addClass("hidden");
	});

	$navEditUser.on("click", async function () {
		hideElements();
		$editNameInput.val(currentUser.name);
		$editPasswordInput.attr("placeholder", "Enter new password");
		$editUserForm.toggle();
		$createStoryForm.addClass("hidden");
	});

	//
	// ***************************
	// ** FORM SUBMIT LISTENERS **
	// ***************************
	//

	// Event listener for logging in. If successfully we will setup the user instance
	$loginForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page-refresh on submit
		// grab the username and password
		const username = $("#login-username").val();
		const password = $("#login-password").val();
		// call the login static method to build a user instance and set the global user to the user instance
		currentUser = await User.login(username, password);
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	// Event listener for signing up. If successfully we will setup a new user instance
	$createAccountForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page refresh
		// grab the required fields
		let { name, username, password } = newUserInfo();
		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create({ name, username, password });
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	// event handler for submitting a story
	$createStoryForm.on("submit", async function () {
		// post new story
		if (isDuplicateUrl()) {
			alert("A story with this URL already exists!");
			return;
		}
		let newStory = createNewStoryObj();
		// const storyListInstance = await StoryList.getStories();
		await StoryList.addStory(currentUser, newStory, currentUser.username);
		generateStories();
		$createStoryForm.slideToggle();
		$allStoriesList.show();
		emptySubmitForm();
	});

	// event handler for editting a story
	$editArticleForm.on("submit", async function (e) {
		e.preventDefault();
		const storyId = storyBeingEditted.storyId;
		await currentUser.editStory(
			storyId,
			$editAuthorInput.val(),
			$editTitleInput.val(),
			$editUrlInput.val()
		);
		updateStoryToEdit();
		await generateMyStories();
		$editArticleForm.slideToggle();
		$editArticleForm.addClass("hidden");
	});

	// event handler for editting a user from the submit form
	$editUserForm.on("submit", async function (e) {
		e.preventDefault();
		await currentUser.editUser($editNameInput.val(), $editPasswordInput.val());
		profileInfoUpdated = true;
		updateUserInstance();
		await generateMyStories();
		await loadProfileInfo();
		$editUserForm.toggle();
		$allStoriesList.show();
		$editUserForm.addClass("hidden");
	});

	//
	// ******************************************
	// ** FUNCTIONS RELATED TO FULL STORY LIST **
	// ******************************************
	//

	// A rendering function to call the StoryList.getStories static method,
	// which will generate a storyListInstance and then render it.
	async function generateStories() {
		// update our global variable with an instance of StoryList
		storyList = await StoryList.getStories();
		// empty out that part of the page
		$allStoriesList.empty();
		appendStories();
		if (currentUser) {
			await loadProfileInfo();
		}
	}

	// appends the list of all stories to the DOM
	function appendStories() {
		// loop through all of our stories and generate HTML for them
		storyList.stories.map((story) => {
			const storyHTML = generateStoryHTML(story);
			$allStoriesList.append(storyHTML);
		});
	}
	// A function to render HTML for an individual Story instance
	function generateStoryHTML(story) {
		let hostName = getHostName(story.url);
		return $(`
      	<li id="${story.storyId}">
       		${emptyStarMarkup}
        	<a class="article-link" href="${story.url}" target="a_blank">
         		<strong>${story.title}</strong>
        	</a>
        	<small class="article-author">by ${story.author}</small>
        	<small class="article-hostname ${hostName}">(${hostName})</small>
        	<small class="article-username">posted by ${story.username}</small>
      	</li>
    	`);
	}

	//
	// *************************************************
	// ** FUNCTIONS RELATED TO LIST OF USER'S STORIES **
	// *************************************************
	//

	// empty the text inputs in the submit-story form
	function emptySubmitForm() {
		$createStoryTitle.val("");
		$createStoryAuthor.val("");
		$createStoryUrl.val("");
	}

	// updates the DOM to show only the stories that the currentUser has submitted
	async function generateMyStories() {
		const myStories = await currentUser.findMyStories();
		$myStoriesList.empty();
		appendMyStories(myStories);
		addStarsTrashAndPencils();
		storyBeingEditted = {};
	}

	// appends the list of user's stories to the DOM
	function appendMyStories(myStories) {
		if (myStories.length === 0) {
			$myStoriesList.append(`<h5>No stories added by user yet!</h5>`);
		}
		myStories.map((story) => {
			$myStoriesList.append(generateMyStoryHTML(story));
		});
	}
	// generates the markup for the list of stories that the user has submitted
	function generateMyStoryHTML(story) {
		let hostName = getHostName(story.url);
		return $(`
	    <li id="${story.storyId}">
			${trashMarkup}
			${emptyStarMarkup}
        	<a class="article-link" href="${story.url}" target="a_blank">
          		<strong>${story.title}</strong>
        	</a>
        	<small class="article-author">by ${story.author}</small>
			<small class="article-hostname ${hostName}">(${hostName})</small>
			${pencilMarkup}
        	<small class="article-username">posted by ${story.username}</small>
      	</li>
    	`);
	}

	// this function only runs within the generateMyStories function.
	// - makes stars next to favorited stories in the my-stories list solid
	// - adds a trashcan next to each story in the my-stories list
	function addStarsTrashAndPencils() {
		if (currentUser) {
			let storyList = $("#my-articles li");
			showFavorites(storyList);
			let myStoryList = $("#my-articles li");
			armTrashcans(myStoryList);
			armPencils(myStoryList);
		}
	}

	//
	// *************************************************
	// ** FUNCTIONS RELATED TO (UN)FAVORITING STORIES **
	// *************************************************
	//

	// when the user favorites a story, this function selects that story from the DOM
	// and finds the corresponding story from storyList
	async function findFavoritedStory(star) {
		const selectedStory = $(star).parent().nextAll();
		let storyURL = selectedStory.get()[0].href;
		return storyList.stories.filter((story) => {
			const urlsWithSlash = makeBothEndWithSlash(story.url, storyURL);
			return urlsWithSlash[0] === urlsWithSlash[1];
		})[0];
	}

	// adds a listener to an empty star that allows the user to favorite the associated story
	function listenForFavorite(star) {
		star.on("click", async function (event) {
			let favoritedStory = await findFavoritedStory(this);
			const storyId = favoritedStory.storyId;
			await currentUser.makeFavorite(storyId);
			makeStarFull(this);
		});
	}

	// adds a listener to a solid star that allows the user to unfavorite the associated story
	function listenForUnfavorite(star) {
		star.on("click", async function (event) {
			let favoritedStory = await findFavoritedStory(this);
			const storyId = favoritedStory.storyId;
			await currentUser.unfavorite(storyId);
			makeStarEmpty(this);
		});
	}

	// adjusts the class of the font-awesome star to make it empty
	function makeStarEmpty(star) {
		$(star).removeClass("fas");
		$(star).addClass("far");
		$(star).off();
		listenForFavorite($(star));
	}

	// adjusts the class of the font-awesome star to make it full
	function makeStarFull(star) {
		$(star).removeClass("far");
		$(star).addClass("fas");
		$(star).off();
		listenForUnfavorite($(star));
	}

	// for each story in the DOM, this function makes its associated star solid
	// and adds a listener to unfavorite the story if it's part of the user's favorites.
	// If the story is not one of the user's favorites, add a listener to favorite
	// the associated story
	async function showFavorites(stories) {
		let solidStar = '<i class="fas fa-star"></i>';
		for (let story of stories) {
			let starContainer = story.querySelector(".star");
			if (checkForFavorite(story)) {
				starContainer.innerHTML = solidStar;
				listenForUnfavorite($(starContainer).find("i"));
			} else {
				listenForFavorite($(starContainer).find("i"));
			}
		}
	}

	// checks to see if the passed-in story has been favorited by the user
	function checkForFavorite(story) {
		for (let favorite of currentUser.favorites) {
			let urlsWithSlash = makeBothEndWithSlash(
				story.querySelector("a").href,
				favorite.url
			);
			if (urlsWithSlash[0] === urlsWithSlash[1]) {
				return true;
			}
		}
		return false;
	}

	// renders the list of favorites
	async function generateFavorites() {
		// update our global variable with the currentUser's favorites
		favoriteList = await currentUser.favorites;
		// empty out that part of the page
		$allFavoritesList.empty();
		appendFavorites(favoriteList);
		let favorites = $("ul li");
		// for each story that show up on the favorites page, allow the user to unfavorite it
		for (let li of favorites) {
			let starContainer = li.querySelector(".star");
			listenForUnfavorite($(starContainer).find("i"));
		}
	}

	// generates the markup for the list of stories that the user has favorited
	function generateFavoriteHTML(story) {
		let hostName = getHostName(story.url);
		return $(`
			<li id="${story.storyId}">
				${solidStarMarkup}
				<a class="article-link" href="${story.url}" target="a_blank">
					<strong>${story.title}</strong>
				</a>
				<small class="article-author">by ${story.author}</small>
				<small class="article-hostname ${hostName}">(${hostName})</small>
				<small class="article-username">posted by ${story.username}</small>
			</li>
			`);
	}

	// appends the list of favorites to the DOM
	function appendFavorites(favoriteList) {
		// if there are no favorites, show a message that there are no favorites
		if (favoriteList.length === 0) {
			$allFavoritesList.append(`<h5>No favorites added!</h5>`);
		}
		// loop through all of our stories and generate HTML for them
		favoriteList.map((favorite) => {
			$allFavoritesList.append(generateFavoriteHTML(favorite));
		});
	}

	//
	// *******************************************
	// ** FUNCTIONS RELATED TO DELETING STORIES **
	// *******************************************
	//

	// implements the listenForDelete function to each trashcan
	async function armTrashcans(myStories) {
		for (let li of myStories) {
			let trashContainer = li.querySelector(".trash");
			currentUser.ownStories.map((story) => {
				if (li.querySelector("a").href === story.url) {
					listenForDelete($(trashContainer).find("i"));
					return;
				}
			});
		}
	}

	// adds a listener to each font-awesome trashcan that allows you to delete the associated story
	function listenForDelete(trashcan) {
		trashcan.on("click", async function (event) {
			const selectedStory = $(this).parent().nextAll();
			const storyURL = selectedStory.get()[1].href;
			const deletedStory = storyList.stories.filter((story) => {
				return story.url === storyURL;
			})[0];
			const storyId = deletedStory.storyId;
			await currentUser.deleteStory(storyId);
			removeStoryFromDOM(trashcan);
		});
	}

	// when a trashcan is clicked on, this function removes the story from the DOM that is associated with that trashcan
	function removeStoryFromDOM(trashcan) {
		setTimeout(function () {
			trashcan.parent().parent().remove();
			generateMyStories();
		}, 100);
	}

	//
	// ******************************************
	// ** FUNCTIONS RELATED TO EDITTING A USER **
	// ******************************************
	//

	// updates the name & password instance variables for currentUser
	function updateUserInstance() {
		currentUser.name = $editNameInput.val();
		currentUser.password = $editPasswordInput.val();
	}

	//
	// *******************************************
	// ** FUNCTIONS RELATED TO EDITTING STORIES **
	// *******************************************
	//

	// creates a click listener on a pencil icon that reveals $editArticleForm
	function listenForEditStory(pencil) {
		pencil.on("click", async function () {
			// get the corresponding story from the API
			let clickedStory = await findStoryToEdit(this);
			// create an array of keys from clickedStory
			let clickedStoryKeys = Object.keys(clickedStory);
			// create an array of keys from the corresponding story from storyList
			let storyBeingEdittedKeys = Object.keys(storyBeingEditted);
			// if the story that was just clicked to be editted was NOT already being editted,
			// perform the showEditArticle function (i.e. - slidetoggle)
			if (clickedStoryKeys.length !== storyBeingEdittedKeys.length) {
				showEditArticleForm(this);
			} else {
				for (let key of clickedStoryKeys) {
					if (clickedStory[key] !== storyBeingEditted[key]) {
						showEditArticleForm();
						$editArticleForm.slideToggle();
						break;
					}
				}
			}
		});
	}

	// adds a listener to each font-awesome pencil that allows for deleting stories
	function armPencils(myStories) {
		for (let li of myStories) {
			let pencilContainer = li.querySelector(".pencil");
			listenForEditStory($(pencilContainer).find("i"));
		}
	}

	// reassign the variable that corresponds to the story that is being editted,
	// and then show the edit-article form
	async function showEditArticleForm(pencil) {
		storyBeingEditted = findStoryToEdit(pencil);
		$editArticleForm.slideToggle(fillEditStoryForm());
	}

	// fills the input text boxes in the edit-story form with the current title,
	// author & url for the story clicked on
	function fillEditStoryForm() {
		$editTitleInput.val(storyBeingEditted.title);
		$editAuthorInput.val(storyBeingEditted.author);
		$editUrlInput.val(storyBeingEditted.url);
	}

	// depending on which pencil was clicked in the my-stories section, this function
	// finds the associated story from the DOM and then finds the matching URL from
	// the API
	function findStoryToEdit(pencil) {
		const selectedStory = $(pencil).parent().siblings();
		let storyURL = selectedStory.get()[2].href;
		return storyList.stories.filter((story) => {
			const urlsWithSlash = makeBothEndWithSlash(story.url, storyURL);
			return urlsWithSlash[0] === urlsWithSlash[1];
		})[0];
	}

	// update author title & url of story from storyList so that forms fill correctly
	function updateStoryToEdit() {
		storyBeingEditted.author = $editAuthorInput.val();
		storyBeingEditted.title = $editTitleInput.val();
		storyBeingEditted.url = $editUrlInput.val();
	}

	// creates a new story object based on the input from the submit form
	function createNewStoryObj() {
		return {
			title: $createStoryTitle.val(),
			author: $createStoryAuthor.val(),
			url: $createStoryUrl.val(),
		};
	}
});
