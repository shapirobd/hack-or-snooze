$(async function () {
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
	];

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

	// boolean value that represents whether or not a user's name, username & created time/date
	// are shown in the user profile section
	let profileInfoShown = false;

	// global storyList variable
	let storyList = null;

	// global favoriteList variable
	let favoriteList = null;

	// global currentUser variable
	let currentUser = null;

	let storyToEdit = {};

	await checkIfLoggedIn();

	function newUserInfo() {
		return {
			name: $("#create-account-name").val(),
			username: $("#create-account-username").val(),
			password: $("#create-account-password").val(),
		};
	}

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

	// event handler for clicking 'logout'
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

	// event handler for submitting a story from the submit form
	$createStoryForm.on("submit", async function () {
		// post new story
		let newStory = createNewStoryObj();
		// const storyListInstance = await StoryList.getStories();
		await StoryList.addStory(currentUser, newStory, currentUser.username);
		generateStories();
		$createStoryForm.slideToggle();
		$allStoriesList.show();
		emptySubmitForm();
	});

	$editArticleForm.on("submit", async function (e) {
		e.preventDefault();
		const storyId = storyToEdit.storyId;
		await currentUser.editStory(
			storyId,
			$editAuthorInput.val(),
			$editTitleInput.val(),
			$editUrlInput.val()
		);
		storyToEdit.author = $editAuthorInput.val();
		storyToEdit.title = $editTitleInput.val();
		storyToEdit.url = $editUrlInput.val();
		await generateMyStories();
		$editArticleForm.slideToggle();
		$editArticleForm.addClass("hidden");
		console.log(storyToEdit);
	});

	// creates a new story object based on the input from the submit form
	function createNewStoryObj() {
		return {
			title: $createStoryTitle.val(),
			author: $createStoryAuthor.val(),
			url: $createStoryUrl.val(),
		};
	}

	// empty the text inputs in the submit-story form
	function emptySubmitForm() {
		$createStoryTitle.val("");
		$createStoryAuthor.val("");
		$createStoryUrl.val("");
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

	// when the user favorites a story, this function finds the corresponding story from the API
	async function findFavoritedStory(star) {
		const selectedStory = $(star).parent().nextAll();
		let storyURL = selectedStory.get()[0].href;
		return storyList.stories.filter((story) => {
			const urlsWithSlash = makeBothEndWithSlash(story.url, storyURL);
			return urlsWithSlash[0] === urlsWithSlash[1];
		})[0];
	}

	function findStoryToEdit(pencil) {
		const selectedStory = $(pencil).parent().siblings();
		let storyURL = selectedStory.get()[2].href;
		return storyList.stories.filter((story) => {
			const urlsWithSlash = makeBothEndWithSlash(story.url, storyURL);
			return urlsWithSlash[0] === urlsWithSlash[1];
		})[0];
	}

	function listenForEditStory(pencil) {
		pencil.on("click", async function () {
			let clickedStory = await findStoryToEdit(this);

			let clickedStoryKeys = Object.keys(clickedStory);
			let storyToEditKeys = Object.keys(storyToEdit);
			let isMatch = true;
			if (clickedStoryKeys.length !== storyToEditKeys.length) {
				isMatch = false;
				storyToEdit = await findStoryToEdit(this);
				$editArticleForm.slideToggle(function () {
					$editTitleInput.val(storyToEdit.title);
					$editAuthorInput.val(storyToEdit.author);
					$editUrlInput.val(storyToEdit.url);
				});
			} else {
				for (let key of clickedStoryKeys) {
					if (clickedStory[key] !== storyToEdit[key]) {
						isMatch = false;
						storyToEdit = await findStoryToEdit(this);
						$editArticleForm.slideToggle(function () {
							$editTitleInput.val(storyToEdit.title);
							$editAuthorInput.val(storyToEdit.author);
							$editUrlInput.val(storyToEdit.url);
						});
						$editArticleForm.slideToggle();
						break;
					}
				}
			}
			// if (isMatch === false) {
			// 	const storyId = storyToEdit.storyId;
			// 	submitEdit(storyId, storyToEdit);
			// } else {
			// 	return;
			// }
		});
	}

	// adds a listener to an empty star that allows the user to favorite the associated story
	function listenForFavorite(star) {
		star.on("click", async function (event) {
			let favoritedStory = await findFavoritedStory(this);
			const storyId = favoritedStory.storyId;
			await currentUser.makeFavorite(storyId);
			makeStarEmpty(this);
		});
	}

	// adds a listener to a solid star that allows the user to unfavorite the associated story
	function listenForUnfavorite(star) {
		star.on("click", async function (event) {
			let favoritedStory = await findFavoritedStory(this);
			const storyId = favoritedStory.storyId;
			await currentUser.unfavorite(storyId);
			makeStarFull(this);
		});
	}

	// adjusts the class of the font-awesome star to make it empty
	function makeStarEmpty(star) {
		$(star).removeClass("far");
		$(star).addClass("fas");
		$(star).off();
		listenForUnfavorite($(star));
	}

	// adjusts the class of the font-awesome star to make it full
	function makeStarFull(star) {
		$(star).removeClass("fas");
		$(star).addClass("far");
		$(star).off();
		listenForFavorite($(star));
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

	/**
	 * Event handler for Navigation to Homepage
	 */

	$("body").on("click", "#nav-all", async function () {
		hideElements();
		generateStories();
		$allStoriesList.show();
	});

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

	function armPencils(myStories) {
		for (let li of myStories) {
			let pencilContainer = li.querySelector(".pencil");
			listenForEditStory($(pencilContainer).find("i"));
		}
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

	// updates the DOM to show only the stories that the currentUser has submitted
	async function generateMyStories() {
		const myStories = await currentUser.findMyStories();
		$myStoriesList.empty();
		if (myStories.length === 0) {
			$myStoriesList.append(`<h5>No stories added by user yet!</h5>`);
		}
		myStories.map((story) => {
			$myStoriesList.append(generateMyStoryHTML(story));
		});
		addStarsTrashAndPencils();
		storyToEdit = {};
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

	// loads user profile info (name, username, and created date/time)
	async function loadProfileInfo() {
		if (profileInfoShown === false) {
			$profileName.append(`<b> ${currentUser.name}</b>`);
			$profileUsername.append(`<b> ${currentUser.username}</b>`);
			$profileCreatedDate.append(`<b> ${currentUser.createdAt}</b>`);
			profileInfoShown = true;
		}
		// update the list of stories to show which are the user's favorites
		let stories = $("ol li");
		await showFavorites(stories);
	}

	// A rendering function to call the StoryList.getStories static method,
	// which will generate a storyListInstance and then render it.
	async function generateStories() {
		// update our global variable with an instance of StoryList
		storyList = await StoryList.getStories();
		// empty out that part of the page
		$allStoriesList.empty();
		// loop through all of our stories and generate HTML for them
		storyList.stories.map((story) => {
			const storyHTML = generateStoryHTML(story);
			$allStoriesList.append(storyHTML);
		});
		if (currentUser) {
			await loadProfileInfo();
		}
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

	// hide all elements in elementsArr
	function hideElements(exception) {
		elementsToHide.forEach(($elem) => {
			if ($elem !== exception) {
				$elem.hide();
			}
		});
		$createStoryForm.addClass("hidden");
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

	// sync current user information to localStorage
	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem("token", currentUser.loginToken);
			localStorage.setItem("username", currentUser.username);
		}
	}
});
