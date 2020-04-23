
const DAO = artifacts.require("./DAOFactory.sol")
const ccDAO = artifacts.require("./CcDAO.sol")
const Crowdsale = artifacts.require("./CrowdsaleFactory.sol")
const TokenFactory = artifacts.require("./TokenFactory.sol")
const TokenTemplate = artifacts.require("./TokenTemplate.sol")

contract("DAOFactory", async accounts => {
    const DAOcappedToken = {
        name: "DAO Capped Token",
        symbol: "DCAP",
        decimals: 18,
        logoURL: "https://apollo-uploads-las.s3.amazonaws.com/1442324623/atlanta-hawks-logo-944556.png",
        logoHash: "logoHash", // sha256 hash
        contractHash: "contractHash",
        supply: 100
    }

    const testDAO = {
        Name: "The test DAO",
        FirstlifePlaceID: "testID"
    }

    const owner = accounts[0]
    const futureMember = accounts[1]
    const invalidMember = accounts[2]

    const initDAO = async (from) => {
        const DAOFactory = await DAO.deployed()
        const daoAddress = await DAOFactory.getDAO(testDAO.FirstlifePlaceID, { from: from })
        const DAOinstance = await ccDAO.at(daoAddress)
        return DAOinstance
    }

    before(async function () {
        try {
            await web3.eth.personal.unlockAccount(owner, "", 1000)
            await web3.eth.personal.unlockAccount(futureMember, "", 1000)
            await web3.eth.personal.unlockAccount(invalidMember, "", 1000)
        } catch(error) {
            console.warn(`error in unlocking wallet: ${JSON.stringify(error)}`)
        }
    })

    describe("DAO Creation test", _ => {
        it("Legit DAO Creation", async () => {
            const DAOFactory = await DAO.deployed()
            const CrowdsaleFactory = await Crowdsale.deployed()
            const TokenFactoryInstance = await TokenFactory.deployed()

            const { Name, FirstlifePlaceID } = testDAO

            await DAOFactory.createDAO(Name, FirstlifePlaceID, TokenFactoryInstance.address, CrowdsaleFactory.address, { from: owner })
            const daoAddress = await DAOFactory.getDAO(FirstlifePlaceID, { from: owner })
            const DAOinstance = await ccDAO.at(daoAddress)
            const daoTestID = await DAOinstance.firstlifePlaceID({ from: owner })

            const creator = await DAOinstance.creator({ from: owner })
            assert.equal(creator, owner, "Creator must be the owner")
            assert.equal(daoTestID, testDAO.FirstlifePlaceID, "Should be equal to the one deployed")
        })
    })

    describe("DAO Operations test", _ => {
        it("Legit Join a Created DAO as member", async () => {
            const DAOinstance = await initDAO(futureMember)

            await DAOinstance.join({ from: futureMember })

            const role = await DAOinstance.myRole({ from: futureMember })
            assert.equal(role.toString(), "1", "Role must be MEMBER")
        })
        it("Get My Role", async () => {
            const DAOinstance = await initDAO(owner)

            const role = await DAOinstance.myRole({ from: owner })
            assert.equal(role.toString(), "40", "Role must be OWNER")

            const outsiderRole = await DAOinstance.myRole({ from: invalidMember })
            assert.equal(outsiderRole.toString(), "0", "Role must be NOTMEMBER")
        })
        it("Legit Promote a member", async () => {
            const DAOinstance = await initDAO(owner)

            await DAOinstance.promote(futureMember, 20, { from: owner }) // ROLE_SUPERVISOR
            let futureMemberRole = await DAOinstance.myRole({ from: futureMember })
            assert.equal(futureMemberRole.toString(), "20", "ROLE MUST BE SUPERVISOR")
        })
        it("Legit Demote a member", async () => {
            const DAOinstance = await initDAO(owner)

            await DAOinstance.demote(futureMember, 1, { from: owner }) // ROLE_MEMBER
            futureMemberRole = await DAOinstance.myRole({ from: futureMember })
            assert.equal(futureMemberRole.toString(), "1", "ROLE MUST BE MEMBER")
        })
        it("Legit Kick a member", async () => {
            const DAOinstance = await initDAO(owner)

            await DAOinstance.kickMember(futureMember, { from: owner })
            futureMemberRole = await DAOinstance.myRole({ from: futureMember })
            assert.equal(futureMemberRole.toString(), "0", "MUST BE KICKED")
        })
        it("Illegal Promote a member", async () => {
            const DAOinstance = await initDAO(futureMember)

            try {
                await DAOinstance.promote(owner, 20, { from: futureMember })
            } catch (_) {
                return;
            }
            assert(false, "illegal promote should have failed")
        })
        it("Illegal Demote a member", async () => {
            const DAOinstance = await initDAO(futureMember)

            try {
                await DAOinstance.demote(owner, 1, { from: futureMember })
            } catch (_) {
                return;
            }
            assert(false, "illegal demote should have failed")
        })
        it("Illegal Kick a member", async () => {
            const DAOinstance = await initDAO(futureMember)

            try {
                await DAOinstance.kickMember(owner, { from: futureMember })
            } catch (_) {
                return;
            }
            assert(false, "illegal kick should have failed")
        })
    })
    
    describe("Inner Token Factory test", _ => {
        it("Create tokens", async () => {
            const DAOinstance = await initDAO(owner)
            const TokenFactoryAddress = await DAOinstance.tokenFactory({ from: owner })

            assert.notEqual(TokenFactoryAddress, null, "I should be able to get the TokenFactory address")

            const TokenFactoryInstance = await TokenFactory.at(TokenFactoryAddress)
            const { name, symbol, decimals, logoURL, logoHash, supply, contractHash } = DAOcappedToken

            await TokenFactoryInstance.createToken(name, symbol, decimals, logoURL, logoHash, supply, contractHash, { from: owner })

            const tokenData = await TokenFactoryInstance.getToken(symbol, { from: owner })
            const tokenInstance = await TokenTemplate.at(tokenData[0])
            const tokenSupply = await tokenInstance.totalSupply({ from: owner })

            assert.equal(tokenSupply, DAOcappedToken.supply, "Must have expected token supply")
        })
        it("Legit Transfer tokens", async () => {
            const DAOinstance = await initDAO(owner)
            const TokenFactoryAddress = await DAOinstance.tokenFactory({ from: owner })
            const { symbol, supply } = DAOcappedToken

            assert.notEqual(TokenFactoryAddress, null, "I should be able to get the TokenFactory address")

            const TokenFactoryInstance = await TokenFactory.at(TokenFactoryAddress)

            const tokenData = await TokenFactoryInstance.getToken(symbol, { from: owner })
            const tokenInstance = await TokenTemplate.at(tokenData[0])

            let ownerBalance = await tokenInstance.balanceOf(owner, { from: owner })
            let futureMemberBalance = await tokenInstance.balanceOf(futureMember, { from: futureMember })

            assert.equal(ownerBalance, supply, "Owner should have token equal to total supply before the transfer")
            assert.equal(futureMemberBalance, 0, "Other member should have token equal to 0 before the transfer")

            await tokenInstance.transfer(futureMember, supply / 2, { from: owner })

            ownerBalance = await tokenInstance.balanceOf(owner, { from: owner })
            futureMemberBalance = await tokenInstance.balanceOf(futureMember, { from: futureMember })

            assert.equal(ownerBalance, supply / 2, "Owner should have token equal to half total supply after the transfer")
            assert.equal(futureMemberBalance, supply / 2, "Other member should have token equal to half total supply after the transfer")
        })
    })
})